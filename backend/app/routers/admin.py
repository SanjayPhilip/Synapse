from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from app.database import get_db
from app.models import Profile, JobPosting, Resume, Application, MatchScore, Notification
from app.middleware.auth import require_role
from app.pagination import make_page

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
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_role("admin")),
):
    base = select(Profile).order_by(desc(Profile.created_at))
    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await db.execute(base.offset((page - 1) * page_size).limit(page_size))
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
    return make_page(users_data, total, page, page_size)


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
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_role("admin")),
):
    base = select(JobPosting, Profile).join(Profile, JobPosting.employer_id == Profile.id).order_by(desc(JobPosting.created_at))
    total = await db.scalar(select(func.count()).select_from(select(JobPosting).subquery())) or 0
    result = await db.execute(base.offset((page - 1) * page_size).limit(page_size))
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
            "moderation_status": job.moderation_status,
            "applications_count": app_count or 0,
            "created_at": job.created_at.isoformat() if job.created_at else None,
        })
    return make_page(jobs_data, total, page, page_size)


@router.put("/jobs/{job_id}/moderation")
async def moderate_job(
    job_id: str,
    moderation_status: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_role("admin")),
):
    if moderation_status not in ("approved", "rejected", "flagged", "pending"):
        raise HTTPException(status_code=400, detail="Invalid moderation status")
    result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    job.moderation_status = moderation_status
    await db.commit()
    return {"message": "Job moderation updated", "id": job_id, "moderation_status": job.moderation_status}


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


@router.post("/notifications/broadcast")
async def broadcast_notification(
    title: str = Query(...),
    message: str = Query(default=""),
    link: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_role("admin")),
):
    result = await db.execute(select(Profile.id).where(Profile.is_active == True))
    user_ids = result.scalars().all()
    if not user_ids:
        raise HTTPException(status_code=404, detail="No active users to notify")
    for uid in user_ids:
        db.add(Notification(user_id=uid, title=title, message=message, link=link, notification_type="broadcast"))
    await db.commit()
    return {"message": f"Broadcast sent to {len(user_ids)} users"}


@router.get("/activity")
async def get_recent_activity(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    seeker_name: str | None = Query(default=None),
    days: int | None = Query(default=None, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_role("admin")),
):
    from datetime import datetime, timedelta
    conditions = []
    if status_filter:
        conditions.append(Application.status == status_filter)
    if seeker_name:
        conditions.append(Profile.full_name.ilike(f"%{seeker_name}%"))
    if days:
        conditions.append(Application.created_at >= datetime.utcnow() - timedelta(days=days))

    base = (
        select(Application, Profile, JobPosting)
        .join(Profile, Application.seeker_id == Profile.id)
        .join(JobPosting, Application.job_posting_id == JobPosting.id)
        .order_by(desc(Application.created_at))
    )
    count_query = select(func.count()).select_from(Application)
    for c in conditions:
        base = base.where(c)
        count_query = count_query.where(c)
    total = await db.scalar(count_query) or 0
    result = await db.execute(base.offset((page - 1) * page_size).limit(page_size))
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
    return make_page(activities, total, page, page_size)


@router.get("/health")
async def system_health(
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_role("admin")),
):
    import os
    from app.config import get_settings
    settings = get_settings()
    storage_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "storage"))
    checks = {
        "database": True,
        "storage_writable": os.access(storage_dir, os.W_OK),
        "secret_key_configured": bool(os.environ.get("SECRET_KEY") or (getattr(settings, "SECRET_KEY", None) and "migrate-session" not in str(getattr(settings, "SECRET_KEY", "")))),
        "gemini_api_key_configured": bool(os.environ.get("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", None)),
    }
    # verify DB reachable with a trivial query
    try:
        await db.execute(select(func.count(Profile.id)))
    except Exception:
        checks["database"] = False
    healthy = all(checks.values())
    return {"healthy": healthy, "checks": checks}
