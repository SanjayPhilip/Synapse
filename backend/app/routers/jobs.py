import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.database import get_db
from app.models import JobPosting, Profile, JobAlert
from app.schemas.job import JobPostingCreate, JobPostingUpdate, JobPostingResponse
from app.services.matching import recompute_scores_for_job
from app.middleware.auth import get_current_user
from app.pagination import make_page

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


@router.get("")
async def list_jobs(
    q: str | None = None,
    status: str | None = None,
    category: str | None = None,
    employer_id: uuid.UUID | None = None,
    limit: int | None = Query(default=None, ge=1, le=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if limit is not None:
        page_size = min(limit, 100)
    query = select(JobPosting).order_by(JobPosting.created_at.desc())
    if status:
        query = query.where(JobPosting.status == status)
    else:
        query = query.where(
            (JobPosting.employer_id == current_user.id) | (JobPosting.status == "active")
        )
    # non-owners only see moderation-approved postings
    query = query.where(
        (JobPosting.employer_id == current_user.id) | (JobPosting.moderation_status == "approved")
    )
    if category and category != "All":
        query = query.where(JobPosting.category == category)
    if employer_id:
        query = query.where(JobPosting.employer_id == employer_id)
    if q:
        like = f"%{q}%"
        query = query.where(or_(
            JobPosting.title.ilike(like),
            JobPosting.description.ilike(like),
            JobPosting.category.ilike(like),
            JobPosting.location.ilike(like),
        ))

    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    items = result.scalars().all()
    return make_page(
        [JobPostingResponse.model_validate(j) for j in items],
        total,
        page,
        page_size,
    )


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
    job = JobPosting(employer_id=current_user.id, moderation_status="pending", **data.model_dump())
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


@router.post("/{job_id}/repost")
async def repost_job(
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
    from datetime import datetime
    clone = JobPosting(
        employer_id=current_user.id,
        title=job.title,
        description=job.description,
        requirements=job.requirements or [],
        responsibilities=job.responsibilities or [],
        location=job.location,
        is_remote=job.is_remote,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        salary_currency=job.salary_currency,
        job_type=job.job_type,
        category=job.category,
        auto_screening_enabled=job.auto_screening_enabled,
        auto_approve_threshold=job.auto_approve_threshold,
        auto_reject_threshold=job.auto_reject_threshold,
        status="active",
        moderation_status="pending",
        created_at=datetime.utcnow(),
    )
    db.add(clone)
    await db.flush()
    await db.refresh(clone)
    await _match_job_alerts(db, clone)
    await recompute_scores_for_job(db, clone.id)
    return clone


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
