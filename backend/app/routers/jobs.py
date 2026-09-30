import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, cast, String
from app.database import get_db
from app.models import JobPosting, Profile, JobAlert
from app.schemas.job import (
    JobPostingCreate,
    JobPostingUpdate,
    JobPostingResponse,
    JobFacetsResponse,
    SkillFacet,
)
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
    job_type: str | None = None,
    is_remote: bool | None = None,
    min_salary: int | None = None,
    max_salary: int | None = None,
    location: str | None = None,
    experience_level: str | None = None,
    skill: str | None = None,
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
    if job_type and job_type.lower() != "all":
        query = query.where(JobPosting.job_type.ilike(f"%{job_type}%"))
    if is_remote is not None:
        query = query.where(JobPosting.is_remote == is_remote)
    if min_salary is not None and min_salary > 0:
        query = query.where(or_(
            JobPosting.salary_max >= min_salary,
            and_(JobPosting.salary_min.isnot(None), JobPosting.salary_min >= min_salary),
        ))
    if max_salary is not None and max_salary > 0:
        query = query.where(and_(
            JobPosting.salary_min.isnot(None),
            JobPosting.salary_min <= max_salary,
        ))
    if location:
        query = query.where(JobPosting.location.ilike(f"%{location}%"))
    if experience_level and experience_level.lower() != "all":
        exp_lower = experience_level.lower()
        if any(w in exp_lower for w in ["entry", "junior", "intern"]):
            query = query.where(or_(
                JobPosting.title.ilike("%entry%"),
                JobPosting.title.ilike("%junior%"),
                JobPosting.title.ilike("%intern%"),
                JobPosting.title.ilike("%associate%"),
                JobPosting.description.ilike("%entry level%"),
                JobPosting.description.ilike("%junior%"),
            ))
        elif any(w in exp_lower for w in ["lead", "staff", "principal", "director"]):
            query = query.where(or_(
                JobPosting.title.ilike("%lead%"),
                JobPosting.title.ilike("%staff%"),
                JobPosting.title.ilike("%principal%"),
                JobPosting.title.ilike("%director%"),
                JobPosting.description.ilike("%lead%"),
                JobPosting.description.ilike("%staff engineer%"),
            ))
        elif any(w in exp_lower for w in ["senior", "sr"]):
            query = query.where(or_(
                JobPosting.title.ilike("%senior%"),
                JobPosting.title.ilike("%sr.%"),
                JobPosting.title.ilike("%sr %"),
                JobPosting.description.ilike("%senior%"),
            ))
        elif "mid" in exp_lower:
            query = query.where(and_(
                ~JobPosting.title.ilike("%senior%"),
                ~JobPosting.title.ilike("%lead%"),
                ~JobPosting.title.ilike("%principal%"),
                ~JobPosting.title.ilike("%junior%"),
                ~JobPosting.title.ilike("%intern%"),
            ))
    if skill:
        skill_like = f"%{skill}%"
        query = query.where(or_(
            JobPosting.title.ilike(skill_like),
            JobPosting.description.ilike(skill_like),
            cast(JobPosting.requirements, String).ilike(skill_like),
        ))
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


@router.get("/facets", response_model=JobFacetsResponse)
async def get_job_facets(
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(JobPosting).where(
        (JobPosting.status == "active") & (
            (JobPosting.employer_id == current_user.id) | (JobPosting.moderation_status == "approved")
        )
    )
    result = await db.execute(query)
    jobs = result.scalars().all()

    categories: dict[str, int] = {}
    job_types: dict[str, int] = {}
    work_modes: dict[str, int] = {"remote": 0, "on_site": 0}
    experience_levels: dict[str, int] = {
        "Entry Level": 0,
        "Mid Level": 0,
        "Senior Level": 0,
        "Lead / Staff": 0,
    }
    salary_brackets: dict[str, int] = {
        "Under $60k": 0,
        "$60k - $100k": 0,
        "$100k - $150k": 0,
        "$150k+": 0,
    }
    skill_counts: dict[str, int] = {}
    locations: dict[str, int] = {}

    common_tech = [
        "Python", "JavaScript", "TypeScript", "React", "Node.js", "Docker",
        "AWS", "SQL", "PostgreSQL", "Kubernetes", "Go", "Java", "GraphQL",
        "FastAPI", "C++", "Rust", "Tailwind", "Next.js", "CI/CD", "Redis"
    ]

    for job in jobs:
        # Category
        cat = job.category or "Other"
        categories[cat] = categories.get(cat, 0) + 1

        # Job type
        jt_raw = (job.job_type or "full_time").replace("_", " ").title()
        job_types[jt_raw] = job_types.get(jt_raw, 0) + 1

        # Work mode
        if job.is_remote:
            work_modes["remote"] += 1
        else:
            work_modes["on_site"] += 1

        # Location
        if job.location:
            loc = job.location.strip()
            locations[loc] = locations.get(loc, 0) + 1

        # Experience level
        title_lower = (job.title or "").lower()
        desc_lower = (job.description or "").lower()
        full_text = f"{title_lower} {desc_lower}"

        if any(w in title_lower for w in ["lead", "staff", "principal", "director", "head of", "architect"]):
            experience_levels["Lead / Staff"] += 1
        elif any(w in title_lower for w in ["senior", "sr.", "sr "]):
            experience_levels["Senior Level"] += 1
        elif any(w in title_lower for w in ["entry", "junior", "intern", "associate", "graduate"]):
            experience_levels["Entry Level"] += 1
        else:
            experience_levels["Mid Level"] += 1

        # Salary brackets
        sal = job.salary_max or job.salary_min
        if sal is not None:
            if sal < 60000:
                salary_brackets["Under $60k"] += 1
            elif sal < 100000:
                salary_brackets["$60k - $100k"] += 1
            elif sal < 150000:
                salary_brackets["$100k - $150k"] += 1
            else:
                salary_brackets["$150k+"] += 1

        # Skills from requirements + tech keyword matching
        reqs = job.requirements or []
        for req in reqs:
            if isinstance(req, str):
                cleaned = req.strip()
                if cleaned and len(cleaned) <= 30:
                    skill_counts[cleaned] = skill_counts.get(cleaned, 0) + 1

        for tech in common_tech:
            if tech.lower() in full_text and tech not in skill_counts:
                skill_counts[tech] = skill_counts.get(tech, 0) + 1

    sorted_skills = sorted(skill_counts.items(), key=lambda x: x[1], reverse=True)[:15]
    top_skills = [SkillFacet(name=name, count=count) for name, count in sorted_skills]
    sorted_locs = dict(sorted(locations.items(), key=lambda x: x[1], reverse=True)[:8])

    return JobFacetsResponse(
        categories=categories,
        job_types=job_types,
        work_modes=work_modes,
        experience_levels=experience_levels,
        salary_brackets=salary_brackets,
        top_skills=top_skills,
        locations=sorted_locs,
        total_jobs=len(jobs),
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
