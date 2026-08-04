import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import JobPosting, Profile, JobAlert
from app.schemas.job import JobPostingCreate, JobPostingUpdate, JobPostingResponse
from app.services.matching import recompute_scores_for_job
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


async def _match_job_alerts(db: AsyncSession, job: JobPosting):
    result = await db.execute(select(JobAlert).where(JobAlert.is_active == True))
    alerts = result.scalars().all()
    if not alerts:
        return

    title_desc = f"{job.title} {job.description}".lower()
    job_category = (job.category or "").lower()
    job_location = (job.location or "").lower()
    matched = []
    for alert in alerts:
        kw_match = any(k.lower() in title_desc for k in (alert.keywords or []))
        cat_match = bool(alert.category) and alert.category.lower() == job_category
        loc_match = bool(alert.location) and alert.location.lower() in job_location
        if kw_match or cat_match or loc_match:
            matched.append(alert)

    if not matched:
        return

    from app.routers.applications import _notify
    for alert in matched:
        await _notify(
            db,
            alert.seeker_id,
            "New job alert",
            f"A new job matches your alert: \"{job.title}\"",
            "job_alert",
            link="/app/jobs",
        )


@router.get("", response_model=list[JobPostingResponse])
async def list_jobs(
    status: str | None = None,
    category: str | None = None,
    employer_id: uuid.UUID | None = None,
    limit: int = Query(default=50, le=100),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(JobPosting).order_by(JobPosting.created_at.desc())
    if status:
        query = query.where(JobPosting.status == status)
    else:
        query = query.where(
            (JobPosting.employer_id == current_user.id) | (JobPosting.status == "active")
        )
    if category and category != "All":
        query = query.where(JobPosting.category == category)
    if employer_id:
        query = query.where(JobPosting.employer_id == employer_id)
    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{job_id}", response_model=JobPostingResponse)
async def get_job(
    job_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("", response_model=JobPostingResponse)
async def create_job(
    data: JobPostingCreate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = JobPosting(employer_id=current_user.id, **data.model_dump())
    db.add(job)
    await db.flush()
    await db.refresh(job)
    await _match_job_alerts(db, job)
    await recompute_scores_for_job(db, job.id)
    return job


@router.put("/{job_id}", response_model=JobPostingResponse)
async def update_job(
    job_id: uuid.UUID,
    data: JobPostingUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobPosting).where(JobPosting.id == job_id, JobPosting.employer_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or not authorized")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(job, key, value)
    await db.flush()
    await db.refresh(job)
    await recompute_scores_for_job(db, job.id)
    return job


@router.delete("/{job_id}")
async def delete_job(
    job_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobPosting).where(JobPosting.id == job_id, JobPosting.employer_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or not authorized")
    await db.delete(job)
    return {"detail": "Deleted"}
