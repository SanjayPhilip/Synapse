import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import SavedJob, JobPosting, Profile
from app.schemas.saved_job import SavedJobCreate, SavedJobResponse
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/saved-jobs", tags=["saved_jobs"])


@router.get("", response_model=list[SavedJobResponse])
async def list_saved_jobs(
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedJob)
        .options(selectinload(SavedJob.job_posting))
        .where(SavedJob.seeker_id == current_user.id)
        .order_by(SavedJob.created_at.desc())
    )
    saved = result.scalars().all()
    out = []
    for s in saved:
        d = SavedJobResponse.model_validate(s)
        if s.job_posting:
            d.job_posting = {
                "id": str(s.job_posting.id),
                "title": s.job_posting.title,
                "employer_id": str(s.job_posting.employer_id),
                "location": s.job_posting.location,
                "job_type": s.job_posting.job_type,
            }
        out.append(d)
    return out


@router.post("")
async def save_job(
    data: SavedJobCreate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(SavedJob).where(
            SavedJob.seeker_id == current_user.id,
            SavedJob.job_posting_id == data.job_posting_id,
        )
    )
    if existing.scalar_one_or_none():
        return {"detail": "Already saved"}

    saved = SavedJob(
        seeker_id=current_user.id,
        job_posting_id=data.job_posting_id,
        match_score_at_save=data.match_score_at_save,
    )
    db.add(saved)
    await db.flush()
    return {"detail": "Saved"}


@router.delete("/{job_id}")
async def unsave_job(
    job_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SavedJob).where(
            SavedJob.seeker_id == current_user.id,
            SavedJob.job_posting_id == job_id,
        )
    )
    saved = result.scalar_one_or_none()
    if not saved:
        raise HTTPException(status_code=404, detail="Not saved")
    await db.delete(saved)
    return {"detail": "Removed"}
