import asyncio
from datetime import datetime, timedelta
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import get_settings
from app.database import get_async_session
from app.models import JobAlert, JobPosting, Profile, ExternalJob
from app.services.email import send_job_alert_email
from app.services.external_jobs import search_external_jobs
from app.routers.applications import _notify

scheduler: Optional[AsyncIOScheduler] = None


async def _get_new_internal_jobs(db: AsyncSession, alert: JobAlert, since: datetime) -> list[JobPosting]:
    """Fetch new internal job postings matching alert criteria since last check."""
    filters = [JobPosting.status == "active", JobPosting.created_at > since]
    if alert.keywords:
        keyword_filters = []
        for kw in alert.keywords:
            keyword_filters.append(
                JobPosting.title.ilike(f"%{kw}%") |
                JobPosting.description.ilike(f"%{kw}%") |
                JobPosting.requirements.op("@>")([kw])
            )
        if keyword_filters:
            from sqlalchemy import or_
            filters.append(or_(*keyword_filters))
    if alert.category:
        filters.append(JobPosting.category == alert.category)
    if alert.location:
        filters.append(JobPosting.location.ilike(f"%{alert.location}%"))

    result = await db.execute(
        select(JobPosting).where(*filters).order_by(JobPosting.created_at.desc()).limit(50)
    )
    return list(result.scalars().all())


async def _get_new_external_jobs(db: AsyncSession, alert: JobAlert, since: datetime) -> list[ExternalJob]:
    """Fetch new external jobs matching alert criteria since last check."""
    q = " ".join(alert.keywords) if alert.keywords else ""
    location = alert.location
    jobs, stale = await search_external_jobs(db, q, location, limit=50)
    return [j for j in jobs if j.posted_at and j.posted_at > since]


def _job_to_match_dict(job, match_score: int = 80) -> dict:
    """Convert job to dict for email template."""
    base_url = get_settings().APP_BASE_URL
    return {
        "title": job.title,
        "company": getattr(job, "company", None) or getattr(job, "employer_id", "Unknown"),
        "location": job.location or "Remote",
        "match_score": match_score,
        "link": f"{base_url}/app/jobs/{job.id}" if hasattr(job, "id") else f"{base_url}/app/jobs/external/{job.id}",
    }


async def process_job_alert(alert_id: str):
    """Process a single job alert - find new matches and notify."""
    settings = get_settings()
    async for db in get_async_session():
        try:
            result = await db.execute(select(JobAlert).where(JobAlert.id == alert_id))
            alert = result.scalar_one_or_none()
            if not alert or not alert.is_active:
                return

            seeker_result = await db.execute(select(Profile).where(Profile.id == alert.seeker_id))
            seeker = seeker_result.scalar_one_or_none()
            if not seeker or not seeker.is_active:
                return

            since = alert.last_checked or (datetime.utcnow() - timedelta(days=7))

            internal_jobs = await _get_new_internal_jobs(db, alert, since)
            external_jobs = await _get_new_external_jobs(db, alert, since)

            all_matches = []
            for job in internal_jobs:
                all_matches.append(_job_to_match_dict(job))
            for job in external_jobs:
                all_matches.append(_job_to_match_dict(job))

            if all_matches:
                if alert.email_enabled:
                    send_job_alert_email(
                        seeker_email=seeker.email,
                        seeker_name=seeker.full_name,
                        matches=all_matches,
                        alert_frequency=alert.frequency,
                    )

                for match in all_matches:
                    await _notify(
                        db,
                        alert.seeker_id,
                        "New job match",
                        f"New match: {match['title']} at {match['company']}",
                        "job_alert",
                        link=match["link"],
                    )

            alert.last_checked = datetime.utcnow()
            await db.commit()

        except Exception as e:
            await db.rollback()
            print(f"[job_alert_scheduler] Error processing alert {alert_id}: {e}")
        finally:
            break


def schedule_alert_jobs():
    """Add periodic jobs for all active alerts."""
    global scheduler
    if not scheduler:
        return

    async def _load_and_schedule():
        async for db in get_async_session():
            result = await db.execute(select(JobAlert).where(JobAlert.is_active == True))  # noqa: E712
            alerts = result.scalars().all()
            for alert in alerts:
                trigger_map = {
                    "instant": IntervalTrigger(minutes=15),
                    "daily": IntervalTrigger(hours=24),
                    "weekly": IntervalTrigger(weeks=1),
                }
                trigger = trigger_map.get(alert.frequency, IntervalTrigger(hours=24))
                job_id = f"job_alert_{alert.id}"
                scheduler.add_job(
                    process_job_alert,
                    trigger=trigger,
                    args=[str(alert.id)],
                    id=job_id,
                    replace_existing=True,
                    max_instances=1,
                )
            break

    asyncio.create_task(_load_and_schedule())


def start_scheduler():
    """Initialize and start the APScheduler."""
    global scheduler
    if scheduler:
        return scheduler

    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.start()
    schedule_alert_jobs()
    return scheduler


def stop_scheduler():
    """Gracefully stop the scheduler."""
    global scheduler
    if scheduler:
        scheduler.shutdown(wait=True)
        scheduler = None