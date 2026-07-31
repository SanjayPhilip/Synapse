import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import Resume, JobPosting, MatchScore, Profile, Application
from app.schemas.match_score import MatchScoreResponse, MatchRequest
from app.middleware.auth import get_current_user
from app.services.matching import compute_match
from app.services.gemini import generate_gap_explanation

router = APIRouter(prefix="/api/v1/matching", tags=["matching"])


@router.post("/match-resume/{resume_id}/{job_id}", response_model=MatchScoreResponse)
async def match_resume_to_job(
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

    scores = compute_match(
        resume.raw_text,
        resume.skills or [],
        job.description,
        job.requirements or [],
    )

    existing = await db.execute(
        select(MatchScore).where(
            MatchScore.resume_id == resume_id,
            MatchScore.job_posting_id == job_id,
            MatchScore.direction == "seeker",
        )
    )
    existing_score = existing.scalar_one_or_none()

    if existing_score:
        existing_score.overall_score = scores["overall_score"]
        existing_score.keyword_score = scores["keyword_score"]
        existing_score.semantic_score = scores["semantic_score"]
        existing_score.gap_report = scores["gap_report"]
        await db.flush()
        await db.refresh(existing_score)
        return existing_score

    ms = MatchScore(
        resume_id=resume_id,
        job_posting_id=job_id,
        direction="seeker",
        overall_score=scores["overall_score"],
        keyword_score=scores["keyword_score"],
        semantic_score=scores["semantic_score"],
        gap_report=scores["gap_report"],
    )
    db.add(ms)
    await db.flush()
    await db.refresh(ms)
    return ms


@router.post("/compute", response_model=MatchScoreResponse)
async def compute_match_score(
    data: MatchRequest,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    resume_text = ""
    resume_skills = []
    job_desc = data.job_description or ""
    job_reqs = data.job_requirements

    if data.resume_id:
        resume_result = await db.execute(
            select(Resume).where(Resume.id == data.resume_id, Resume.user_id == current_user.id)
        )
        resume = resume_result.scalar_one_or_none()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        resume_text = resume.raw_text
        resume_skills = resume.skills or []

    if data.job_posting_id:
        job_result = await db.execute(select(JobPosting).where(JobPosting.id == data.job_posting_id))
        job = job_result.scalar_one_or_none()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        job_desc = job.description
        job_reqs = job.requirements or []

    scores = compute_match(resume_text, resume_skills, job_desc, job_reqs)

    ms = MatchScore(
        resume_id=data.resume_id or uuid.uuid4(),
        job_posting_id=data.job_posting_id or uuid.uuid4(),
        direction=data.direction,
        overall_score=scores["overall_score"],
        keyword_score=scores["keyword_score"],
        semantic_score=scores["semantic_score"],
        gap_report=scores["gap_report"],
    )
    db.add(ms)
    await db.flush()
    await db.refresh(ms)
    return ms


@router.get("/job/{job_id}/candidates")
async def get_ranked_candidates(
    job_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job or job.employer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    apps_result = await db.execute(
        select(Application).where(Application.job_posting_id == job_id)
    )
    applications = apps_result.scalars().all()

    candidates = []
    for app in applications:
        resume_result = await db.execute(select(Resume).where(Resume.id == app.resume_id))
        resume = resume_result.scalar_one_or_none()
        if not resume:
            continue

        scores = compute_match(
            resume.raw_text, resume.skills or [], job.description, job.requirements or []
        )

        user_result = await db.execute(select(Profile).where(Profile.id == app.seeker_id))
        user = user_result.scalar_one_or_none()

        candidates.append({
            "application_id": str(app.id),
            "seeker_id": str(app.seeker_id),
            "seeker_name": user.full_name if user else "Unknown",
            "resume_id": str(resume.id),
            "overall_score": scores["overall_score"],
            "keyword_score": scores["keyword_score"],
            "semantic_score": scores["semantic_score"],
            "gap_report": scores["gap_report"],
            "status": app.status,
        })

    candidates.sort(key=lambda x: x["overall_score"], reverse=True)
    return candidates


@router.get("/user/opportunities")
async def get_ranked_opportunities(
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    resume_result = await db.execute(
        select(Resume).where(Resume.user_id == current_user.id, Resume.is_current == True)
    )
    resume = resume_result.scalar_one_or_none()
    if not resume:
        return []

    jobs_result = await db.execute(
        select(JobPosting).where(JobPosting.status == "active")
    )
    jobs = jobs_result.scalars().all()

    opportunities = []
    for job in jobs:
        scores = compute_match(
            resume.raw_text, resume.skills or [], job.description, job.requirements or []
        )
        opportunities.append({
            "job_id": str(job.id),
            "title": job.title,
            "employer_id": str(job.employer_id),
            "location": job.location,
            "job_type": job.job_type,
            "is_remote": job.is_remote,
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "overall_score": scores["overall_score"],
            "keyword_score": scores["keyword_score"],
            "semantic_score": scores["semantic_score"],
            "gap_report": scores["gap_report"],
        })

    opportunities.sort(key=lambda x: x["overall_score"], reverse=True)
    return opportunities
