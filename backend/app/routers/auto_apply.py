import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import AutoApplyLog, Resume, JobPosting, Profile
from app.schemas.auto_apply import AutoApplyLogCreate, AutoApplyLogUpdate, AutoApplyLogResponse
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/auto-apply", tags=["auto_apply"])


@router.get("", response_model=list[AutoApplyLogResponse])
async def list_auto_apply_logs(
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AutoApplyLog).where(AutoApplyLog.seeker_id == current_user.id).order_by(AutoApplyLog.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{seeker_id}/{job_id}", response_model=AutoApplyLogResponse | None)
async def get_auto_apply_log(
    seeker_id: uuid.UUID,
    job_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AutoApplyLog).where(
            AutoApplyLog.seeker_id == seeker_id,
            AutoApplyLog.job_posting_id == job_id,
        )
    )
    return result.scalar_one_or_none()


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
    return log


@router.put("/{log_id}", response_model=AutoApplyLogResponse)
async def update_auto_apply_log(
    log_id: uuid.UUID,
    data: AutoApplyLogUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AutoApplyLog).where(AutoApplyLog.id == log_id))
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(log, key, value)
    await db.flush()
    await db.refresh(log)
    return log
