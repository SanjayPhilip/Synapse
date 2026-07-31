import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import JobPosting, Profile
from app.schemas.job import JobPostingCreate, JobPostingUpdate, JobPostingResponse
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


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
