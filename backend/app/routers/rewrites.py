import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import RewriteSuggestion, Resume, JobPosting, MatchScore, Profile
from app.schemas.rewrite import RewriteSuggestionUpdate, RewriteSuggestionResponse
from app.middleware.auth import get_current_user
from app.services.gemini import generate_rewrite_suggestions

router = APIRouter(prefix="/api/v1/rewrites", tags=["rewrites"])


@router.get("/{resume_id}/{job_id}", response_model=list[RewriteSuggestionResponse])
async def get_suggestions(
    resume_id: uuid.UUID,
    job_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RewriteSuggestion)
        .where(RewriteSuggestion.resume_id == resume_id, RewriteSuggestion.job_posting_id == job_id)
        .order_by(RewriteSuggestion.created_at.desc())
    )
    return result.scalars().all()


@router.post("/generate/{resume_id}/{job_id}")
async def generate_suggestions(
    resume_id: uuid.UUID,
    job_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    resume_result = await db.execute(
        select(Resume).where(Resume.id == resume_id, Resume.user_id == current_user.id)
    )
    resume = resume_result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    job_result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    gap_result = await db.execute(
        select(MatchScore).where(
            MatchScore.resume_id == resume_id,
            MatchScore.job_posting_id == job_id,
        )
    )
    gap_score = gap_result.scalar_one_or_none()
    gap_report = gap_score.gap_report if gap_score else {}

    suggestions = await generate_rewrite_suggestions(
        resume.parsed_data, job.description, job.requirements or [], gap_report
    )

    await db.execute(
        select(RewriteSuggestion).where(
            RewriteSuggestion.resume_id == resume_id,
            RewriteSuggestion.job_posting_id == job_id,
            RewriteSuggestion.status == "pending",
        )
    )

    created = []
    for s in suggestions:
        rs = RewriteSuggestion(
            resume_id=resume_id,
            job_posting_id=job_id,
            section_type=s.get("section_type", "summary"),
            original_text=s.get("original_text", ""),
            suggested_text=s.get("suggested_text", ""),
            reasoning=s.get("reasoning", ""),
            status="pending",
        )
        db.add(rs)
        created.append(rs)

    await db.flush()
    for rs in created:
        await db.refresh(rs)
    return [RewriteSuggestionResponse.model_validate(rs) for rs in created]


@router.put("/{suggestion_id}", response_model=RewriteSuggestionResponse)
async def update_suggestion(
    suggestion_id: uuid.UUID,
    data: RewriteSuggestionUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(RewriteSuggestion).where(RewriteSuggestion.id == suggestion_id))
    suggestion = result.scalar_one_or_none()
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(suggestion, key, value)

    if data.status and data.status in ("accepted", "rejected", "edited"):
        suggestion.resolved_at = datetime.utcnow()

    await db.flush()
    await db.refresh(suggestion)
    return suggestion
