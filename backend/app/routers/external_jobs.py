import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import ExternalJob, JobPosting, Profile, SavedJob, AutoApplyLog
from app.schemas.external_job import ExternalJobSearchResponse, ExternalJobResponse
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import rate_limiter
from app.services.external_jobs import search_external_jobs

router = APIRouter(prefix="/api/v1/external-jobs", tags=["external_jobs"])

SYSTEM_EMPLOYER_EMAIL = "external-jobs@synapse.local"


async def _materialize_job(db: AsyncSession, ext: ExternalJob) -> JobPosting:
    result = await db.execute(
        select(JobPosting).where(
            JobPosting.external_source == ext.external_source,
            JobPosting.external_id == ext.external_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    result = await db.execute(select(Profile).where(Profile.email == SYSTEM_EMPLOYER_EMAIL))
    employer = result.scalar_one_or_none()
    if employer is None:
        employer = Profile(
            email=SYSTEM_EMPLOYER_EMAIL,
            full_name="External Jobs",
            role="employer",
            company_name="External Jobs",
            password_hash="!",
            is_verified=True,
        )
        db.add(employer)
        await db.flush()

    job = JobPosting(
        employer_id=employer.id,
        title=ext.title,
        description=ext.description,
        requirements=ext.requirements,
        responsibilities=[],
        location=ext.location,
        is_remote=ext.is_remote,
        salary_min=ext.salary_min,
        salary_max=ext.salary_max,
        salary_currency=ext.salary_currency,
        job_type=ext.job_type,
        category=ext.category or "Software Engineering",
        status="active",
        external_source=ext.external_source,
        external_id=ext.external_id,
        external_url=ext.external_url,
    )
    db.add(job)
    await db.flush()
    return job


@router.get("/search", response_model=ExternalJobSearchResponse)
async def search_external(
    q: str,
    location: str | None = None,
    limit: int = 20,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    _rate: None = Depends(rate_limiter(15, 60)),
):
    jobs, stale = await search_external_jobs(db, q, location, limit)
    resp = ExternalJobSearchResponse(stale=stale, jobs=[ExternalJobResponse.model_validate(j) for j in jobs])
    await db.commit()
    return resp


@router.post("/{job_id}/save")
async def save_external_job(
    job_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ExternalJob).where(ExternalJob.id == job_id))
    ext = result.scalar_one_or_none()
    if not ext:
        raise HTTPException(status_code=404, detail="External job not found")

    job_posting = await _materialize_job(db, ext)
    existing = await db.execute(
        select(SavedJob).where(
            SavedJob.seeker_id == current_user.id,
            SavedJob.job_posting_id == job_posting.id,
        )
    )
    if existing.scalar_one_or_none():
        await db.commit()
        return {"detail": "Already saved", "saved": True, "job_posting_id": str(job_posting.id)}

    db.add(SavedJob(seeker_id=current_user.id, job_posting_id=job_posting.id, match_score_at_save=None))
    await db.commit()
    return {"detail": "Saved", "saved": True, "job_posting_id": str(job_posting.id)}


@router.post("/{job_id}/apply")
async def apply_external_job(
    job_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ExternalJob).where(ExternalJob.id == job_id))
    ext = result.scalar_one_or_none()
    if not ext:
        raise HTTPException(status_code=404, detail="External job not found")

    job_posting = await _materialize_job(db, ext)
    existing = await db.execute(
        select(AutoApplyLog).where(
            AutoApplyLog.seeker_id == current_user.id,
            AutoApplyLog.job_posting_id == job_posting.id,
            AutoApplyLog.status.in_(["pending", "in_progress", "success"]),
        )
    )
    log = existing.scalar_one_or_none()
    if not log:
        log = AutoApplyLog(
            seeker_id=current_user.id,
            job_posting_id=job_posting.id,
            status="pending",
            attempt_count=0,
        )
        db.add(log)
    await db.commit()
    return {
        "detail": "Queued",
        "job_posting_id": str(job_posting.id),
        "log_id": str(log.id),
        "external_url": ext.external_url,
    }
