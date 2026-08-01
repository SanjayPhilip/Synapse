import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import JobAlert, Profile
from app.schemas.job_alert import JobAlertCreate, JobAlertUpdate, JobAlertResponse
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/job-alerts", tags=["job_alerts"])


@router.get("", response_model=list[JobAlertResponse])
async def list_my_alerts(
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobAlert)
        .where(JobAlert.seeker_id == current_user.id)
        .order_by(JobAlert.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=JobAlertResponse)
async def create_alert(
    data: JobAlertCreate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not data.keywords and not data.category:
        raise HTTPException(status_code=400, detail="Provide at least one keyword or a category")

    alert = JobAlert(
        seeker_id=current_user.id,
        keywords=data.keywords,
        category=data.category,
        location=data.location,
    )
    db.add(alert)
    await db.flush()
    await db.refresh(alert)
    return alert


@router.put("/{alert_id}", response_model=JobAlertResponse)
async def update_alert(
    alert_id: uuid.UUID,
    data: JobAlertUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobAlert).where(JobAlert.id == alert_id, JobAlert.seeker_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Job alert not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(alert, key, value)
    await db.flush()
    await db.refresh(alert)
    return alert


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobAlert).where(JobAlert.id == alert_id, JobAlert.seeker_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Job alert not found")
    await db.delete(alert)
    return {"detail": "Deleted"}
