import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import AutoApplyLog, Resume, JobPosting, Profile
from app.schemas.auto_apply import AutoApplyLogCreate, AutoApplyLogUpdate, AutoApplyLogResponse
from app.middleware.auth import get_current_user

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

    log = AutoApplyLog(
        seeker_id=current_user.id,
        job_posting_id=data.job_posting_id,
        resume_id=data.resume_id,
        status="in_progress",
        attempt_count=1,
    )
    log.job_posting = job
    db.add(log)
    await db.flush()
    await db.refresh(log)

    try:
        if job.external_url:
            log.status = "success"
            log.submitted_at = datetime.utcnow()
        else:
            log.status = "failed"
            log.error_message = "No external URL available for auto-apply"
    except Exception as e:
        log.status = "failed"
        log.error_message = str(e)

    await db.flush()
    await db.refresh(log)

    from app.routers.applications import _notify
    await _notify(
        db,
        current_user.id,
        "Auto-apply complete",
        f"Auto-apply for \"{job.title}\" finished with status: {log.status}.",
        "application",
        link="/app/applications",
    )

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
