from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.database import get_db
from app.models import Profile, JobPosting, Resume, Application, MatchScore
from app.middleware.auth import require_role

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_role("admin")),
):
    total_users = await db.scalar(select(func.count(Profile.id)))
    total_seekers = await db.scalar(select(func.count(Profile.id)).where(Profile.role == "seeker"))
    total_employers = await db.scalar(select(func.count(Profile.id)).where(Profile.role == "employer"))
    total_jobs = await db.scalar(select(func.count(JobPosting.id)))
    active_jobs = await db.scalar(select(func.count(JobPosting.id)).where(JobPosting.status == "active"))
    total_resumes = await db.scalar(select(func.count(Resume.id)))
    total_applications = await db.scalar(select(func.count(Application.id)))
    total_matches = await db.scalar(select(func.count(MatchScore.id)))

    avg_score_res = await db.execute(select(func.avg(MatchScore.overall_score)))
    avg_score = avg_score_res.scalar() or 0.0

    return {
        "total_users": total_users or 0,
        "total_seekers": total_seekers or 0,
        "total_employers": total_employers or 0,
        "total_jobs": total_jobs or 0,
        "active_jobs": active_jobs or 0,
        "total_resumes": total_resumes or 0,
        "total_applications": total_applications or 0,
        "total_matches": total_matches or 0,
        "average_match_score": round(float(avg_score), 1),
    }


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_role("admin")),
):
    result = await db.execute(select(Profile).order_by(desc(Profile.created_at)))
    profiles = result.scalars().all()
    
    users_data = []
    for p in profiles:
        users_data.append({
            "id": str(p.id),
            "email": p.email,
            "full_name": p.full_name,
            "role": p.role,
            "company_name": p.company_name,
            "is_active": p.is_active,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })
    return users_data


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    is_active: bool,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_role("admin")),
):
    result = await db.execute(select(Profile).where(Profile.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = is_active
    await db.commit()
    return {"message": "User status updated", "id": user_id, "is_active": user.is_active}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_role("admin")),
):
    if str(current_user.id) == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")
    
    result = await db.execute(select(Profile).where(Profile.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.commit()
    return {"message": "User deleted successfully", "id": user_id}


@router.get("/jobs")
async def list_admin_jobs(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_role("admin")),
):
    result = await db.execute(select(JobPosting, Profile).join(Profile, JobPosting.employer_id == Profile.id).order_by(desc(JobPosting.created_at)))
    rows = result.all()

    jobs_data = []
    for job, employer in rows:
        app_count = await db.scalar(select(func.count(Application.id)).where(Application.job_posting_id == job.id))
        jobs_data.append({
            "id": str(job.id),
            "title": job.title,
            "employer_id": str(job.employer_id),
            "employer_name": employer.full_name,
            "company_name": employer.company_name or "Unknown Company",
            "location": job.location,
            "is_remote": job.is_remote,
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "job_type": job.job_type,
            "status": job.status,
            "applications_count": app_count or 0,
            "created_at": job.created_at.isoformat() if job.created_at else None,
        })
    return jobs_data


@router.delete("/jobs/{job_id}")
async def delete_admin_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_role("admin")),
):
    result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    await db.delete(job)
    await db.commit()
    return {"message": "Job posting deleted by admin", "id": job_id}


@router.get("/activity")
async def get_recent_activity(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_role("admin")),
):
    result = await db.execute(
        select(Application, Profile, JobPosting)
        .join(Profile, Application.seeker_id == Profile.id)
        .join(JobPosting, Application.job_posting_id == JobPosting.id)
        .order_by(desc(Application.created_at))
        .limit(15)
    )
    rows = result.all()

    activities = []
    for app, seeker, job in rows:
        activities.append({
            "id": str(app.id),
            "seeker_name": seeker.full_name,
            "seeker_email": seeker.email,
            "job_title": job.title,
            "status": app.status,
            "match_score": float(app.match_score) if app.match_score else None,
            "created_at": app.created_at.isoformat() if app.created_at else None,
        })
    return activities
