"""Aggregated analytics endpoints: employer hiring metrics, seeker outcomes, admin growth."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import Application, JobPosting, Profile, Notification
from app.middleware.auth import get_current_user, require_role

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


def _date_range(days: int | None, from_str: str | None, to_str: str | None) -> tuple[datetime | None, datetime | None]:
    if from_str:
        try:
            from_dt = datetime.fromisoformat(from_str)
        except ValueError:
            from_dt = None
    else:
        from_dt = datetime.utcnow() - timedelta(days=days or 30) if days else None
    if to_str:
        try:
            to_dt = datetime.fromisoformat(to_str)
        except ValueError:
            to_dt = None
    else:
        to_dt = datetime.utcnow()
    return from_dt, to_dt


def _bucket_scores(scores: list[float]) -> list[dict]:
    buckets = [0] * 5
    labels = ["0-20", "21-40", "41-60", "61-80", "81-100"]
    for s in scores:
        idx = min(int(s // 20), 4)
        buckets[idx] += 1
    return [{"bucket": labels[i], "count": buckets[i]} for i in range(5)]


def _fill_series(start: datetime, end: datetime, points: list[tuple], day_step: int = 1) -> list[dict]:
    """Fill date gaps so the chart series is continuous."""
    by_day = {d.date() if hasattr(d, "date") else d: c for d, c in points}
    series = []
    cur = start.date()
    end_date = end.date()
    while cur <= end_date:
        series.append({"date": cur.isoformat(), "count": by_day.get(cur, 0)})
        cur += timedelta(days=day_step)
    return series


@router.get("/employer")
async def employer_analytics(
    from_date: str | None = Query(default=None, alias="from"),
    to_date: str | None = Query(default=None, alias="to"),
    days: int | None = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_role("employer")),
):
    from_dt, to_dt = _date_range(days, from_date, to_date)
    job_ids = select(JobPosting.id).where(JobPosting.employer_id == current_user.id)

    jobs = (await db.execute(select(JobPosting).where(JobPosting.employer_id == current_user.id))).scalars().all()

    base = select(Application).where(Application.job_posting_id.in_(job_ids))
    if from_dt:
        base = base.where(Application.created_at >= from_dt)
    if to_dt:
        base = base.where(Application.created_at <= to_dt)

    apps = (await db.execute(base)).scalars().all()

    # Volume over time (daily)
    day_map: dict = {}
    for a in apps:
        day_map[a.created_at.date()] = day_map.get(a.created_at.date(), 0) + 1
    start = from_dt or (min((a.created_at for a in apps), default=datetime.utcnow()).replace(hour=0, minute=0, second=0, microsecond=0))
    volume_series = _fill_series(start, to_dt or datetime.utcnow(), [(d, c) for d, c in day_map.items()])

    # Funnel
    funnel = {"applied": 0, "shortlisted": 0, "hired": 0, "rejected": 0}
    for a in apps:
        if a.status in funnel:
            funnel[a.status] += 1

    # Score distribution
    scores = [float(a.match_score) for a in apps if a.match_score is not None]
    score_dist = _bucket_scores(scores)

    # Time-to-fill: avg days from posting created_at to first application per job with apps
    per_job = []
    for job in jobs:
        job_apps = [a for a in apps if a.job_posting_id == job.id]
        per_job.append({"title": job.title, "count": len(job_apps), "status": job.status})
    per_job.sort(key=lambda x: x["count"], reverse=True)

    fill_days: list[float] = []
    for job in jobs:
        job_apps = sorted([a for a in apps if a.job_posting_id == job.id], key=lambda a: a.created_at)
        if job_apps:
            fill_days.append((job_apps[0].created_at - job.created_at).total_seconds() / 86400)
    time_to_fill_days = round(sum(fill_days) / len(fill_days), 1) if fill_days else None
    avg_apps_per_posting = round(len(apps) / len(jobs), 2) if jobs else 0

    return {
        "volume_over_time": volume_series,
        "funnel": funnel,
        "score_distribution": score_dist,
        "time_to_fill_days": time_to_fill_days,
        "avg_applicants_per_posting": avg_apps_per_posting,
        "per_posting": per_job,
    }


@router.get("/seeker")
async def seeker_analytics(
    from_date: str | None = Query(default=None, alias="from"),
    to_date: str | None = Query(default=None, alias="to"),
    days: int | None = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(get_current_user),
):
    from_dt, to_dt = _date_range(days, from_date, to_date)
    base = select(Application).where(Application.seeker_id == current_user.id)
    if from_dt:
        base = base.where(Application.created_at >= from_dt)
    if to_dt:
        base = base.where(Application.created_at <= to_dt)
    apps = (await db.execute(base)).scalars().all()

    day_map: dict = {}
    for a in apps:
        day_map[a.created_at.date()] = day_map.get(a.created_at.date(), 0) + 1
    start = from_dt or (min((a.created_at for a in apps), default=datetime.utcnow()).replace(hour=0, minute=0, second=0, microsecond=0))
    volume_series = _fill_series(start, to_dt or datetime.utcnow(), [(d, c) for d, c in day_map.items()])

    outcomes = {"applied": 0, "shortlisted": 0, "hired": 0, "rejected": 0}
    for a in apps:
        if a.status in outcomes:
            outcomes[a.status] += 1
    return {"volume_over_time": volume_series, "outcomes": outcomes}


@router.get("/admin")
async def admin_analytics(
    weeks: int = Query(default=8, ge=1, le=52),
    db: AsyncSession = Depends(get_db),
    current_user: Profile = Depends(require_role("admin")),
):
    since = datetime.utcnow() - timedelta(weeks=weeks)
    user_rows = (
        await db.execute(
            select(func.strftime("%Y-%W", Profile.created_at), func.count()).where(Profile.created_at >= since).group_by(func.strftime("%Y-%W", Profile.created_at))
        )
    ).all()
    job_rows = (
        await db.execute(
            select(func.strftime("%Y-%W", JobPosting.created_at), func.count()).where(JobPosting.created_at >= since).group_by(func.strftime("%Y-%W", JobPosting.created_at))
        )
    ).all()
    app_rows = (
        await db.execute(
            select(func.strftime("%Y-%W", Application.created_at), func.count()).where(Application.created_at >= since).group_by(func.strftime("%Y-%W", Application.created_at))
        )
    ).all()

    def to_map(rows):
        return {str(k): v for k, v in rows}

    users_map, jobs_map, apps_map = to_map(user_rows), to_map(job_rows), to_map(app_rows)
    weeks_out = []
    cur = since
    while cur <= datetime.utcnow():
        key = cur.strftime("%Y-%W")
        weeks_out.append({
            "week": key,
            "users": users_map.get(key, 0),
            "jobs": jobs_map.get(key, 0),
            "applications": apps_map.get(key, 0),
        })
        cur += timedelta(weeks=1)
    return {"growth": weeks_out}
