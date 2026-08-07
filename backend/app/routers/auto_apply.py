import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import AutoApplyLog, Resume, JobPosting, Profile
from app.schemas.auto_apply import AutoApplyLogCreate, AutoApplyLogUpdate, AutoApplyLogResponse, DeadLetterRetryRequest
from app.middleware.auth import get_current_user, require_admin
from app.workers.auto_apply_tasks import process_auto_apply, MAX_RETRIES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auto-apply", tags=["auto_apply"])


def _to_response(log: AutoApplyLog) -> AutoApplyLogResponse:
    data = {
        "id": log.id,
        "seeker_id": log.seeker_id,
        "job_posting_id": log.job_posting_id,
        "resume_id": log.resume_id,
        "status": log.status,
        "attempt_count": log.attempt_count,
        "error_message": log.error_message,
        "screenshot_url": log.screenshot_url,
        "submitted_at": log.submitted_at,
        "created_at": log.created_at,
        "updated_at": log.updated_at,
    }
    if log.job_posting:
        jp = log.job_posting
        data["job_posting"] = {
            "id": str(jp.id),
            "title": jp.title,
            "employer_id": str(jp.employer_id),
            "location": jp.location,
            "job_type": jp.job_type,
            "external_url": jp.external_url,
        }
    return AutoApplyLogResponse.model_validate(data)


@router.get("", response_model=list[AutoApplyLogResponse])
async def list_auto_apply_logs(
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AutoApplyLog)
        .options(selectinload(AutoApplyLog.job_posting))
        .where(AutoApplyLog.seeker_id == current_user.id)
        .order_by(AutoApplyLog.created_at.desc())
    )
    return [_to_response(log) for log in result.scalars().all()]


@router.get("/{seeker_id}/{job_id}", response_model=AutoApplyLogResponse | None)
async def get_auto_apply_log(
    seeker_id: uuid.UUID,
    job_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AutoApplyLog)
        .options(selectinload(AutoApplyLog.job_posting))
        .where(
            AutoApplyLog.seeker_id == seeker_id,
            AutoApplyLog.job_posting_id == job_id,
        )
    )
    log = result.scalar_one_or_none()
    if not log:
        return None
    return _to_response(log)


@router.post("", response_model=AutoApplyLogResponse)
async def trigger_auto_apply(
    data: AutoApplyLogCreate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_result = await db.execute(select(JobPosting).where(JobPosting.id == data.job_posting_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.external_url:
        raise HTTPException(status_code=400, detail="No external URL available for auto-apply")

    log = AutoApplyLog(
        seeker_id=current_user.id,
        job_posting_id=data.job_posting_id,
        resume_id=data.resume_id,
        status="queued",
        attempt_count=1,
    )
    log.job_posting = job
    db.add(log)
    await db.flush()
    await db.refresh(log)

    try:
        process_auto_apply.delay(str(log.id))
        logger.info("queued auto-apply for log %s", log.id)
    except Exception as exc:
        log.status = "failed"
        log.error_message = f"Could not enqueue auto-apply: {exc}"
        await db.flush()
        await db.refresh(log)

    return _to_response(log)


@router.put("/{log_id}", response_model=AutoApplyLogResponse)
async def update_auto_apply_log(
    log_id: uuid.UUID,
    data: AutoApplyLogUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AutoApplyLog)
        .options(selectinload(AutoApplyLog.job_posting))
        .where(AutoApplyLog.id == log_id)
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(log, key, value)
    await db.flush()
    await db.refresh(log)
    return _to_response(log)


# Dead letter queue endpoints (admin only)
@router.get("/admin/dead-letter", response_model=list[AutoApplyLogResponse])
async def list_dead_letter_logs(
    current_user: Profile = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List all auto-apply logs in dead letter state."""
    result = await db.execute(
        select(AutoApplyLog)
        .options(selectinload(AutoApplyLog.job_posting))
        .where(AutoApplyLog.status == "dead_letter")
        .order_by(AutoApplyLog.updated_at.desc())
    )
    return [_to_response(log) for log in result.scalars().all()]


@router.post("/admin/dead-letter/retry", response_model=dict)
async def retry_dead_letter_logs(
    request: DeadLetterRetryRequest,
    current_user: Profile = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retry selected dead-letter logs by resetting status and re-queueing."""
    if not request.log_ids:
        raise HTTPException(status_code=400, detail="No log IDs provided")

    retried = 0
    for log_id in request.log_ids:
        result = await db.execute(
            select(AutoApplyLog)
            .options(selectinload(AutoApplyLog.job_posting))
            .where(AutoApplyLog.id == log_id)
        )
        log = result.scalar_one_or_none()
        if not log:
            continue
        if log.status != "dead_letter":
            continue

        log.status = "queued"
        log.attempt_count = 1
        log.error_message = None
        await db.flush()

        try:
            process_auto_apply.delay(str(log.id))
            retried += 1
            logger.info("re-queued dead-letter log %s", log.id)
        except Exception as exc:
            log.status = "failed"
            log.error_message = f"Re-queue failed: {exc}"
            logger.exception("failed to re-queue dead-letter log %s", log.id)

    await db.commit()
    return {"retried": retried, "requested": len(request.log_ids)}


@router.post("/admin/dead-letter/retry-all", response_model=dict)
async def retry_all_dead_letter_logs(
    current_user: Profile = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retry ALL dead-letter logs."""
    result = await db.execute(
        select(AutoApplyLog).where(AutoApplyLog.status == "dead_letter")
    )
    logs = result.scalars().all()

    retried = 0
    for log in logs:
        log.status = "queued"
        log.attempt_count = 1
        log.error_message = None
        await db.flush()

        try:
            process_auto_apply.delay(str(log.id))
            retried += 1
        except Exception:
            log.status = "failed"
            log.error_message = "Re-queue failed"
            logger.exception("failed to re-queue dead-letter log %s", log.id)

    await db.commit()
    return {"retried": retried, "total_dead_letter": len(logs)}


@router.delete("/admin/dead-letter/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dead_letter_log(
    log_id: uuid.UUID,
    current_user: Profile = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete a dead-letter log."""
    result = await db.execute(
        select(AutoApplyLog).where(AutoApplyLog.id == log_id, AutoApplyLog.status == "dead_letter")
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Dead-letter log not found")
    await db.delete(log)
    await db.commit()
