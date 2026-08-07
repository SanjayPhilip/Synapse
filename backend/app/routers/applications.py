import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Application, JobPosting, Profile, Notification, ApplicationStatusHistory
from app.schemas.application import ApplicationCreate, ApplicationUpdate, ApplicationResponse, ApplicationHistoryResponse
from app.middleware.auth import get_current_user
from app.pagination import make_page


async def _record_history(
    db: AsyncSession,
    application_id,
    old_status: str | None,
    new_status: str,
    actor_id=None,
    reason: str | None = None,
    notes: str | None = None,
):
    db.add(ApplicationStatusHistory(
        application_id=application_id,
        old_status=old_status,
        new_status=new_status,
        changed_by=actor_id,
        reason=reason,
        notes=notes,
    ))
    await db.flush()


async def _notify(db: AsyncSession, user_id, title: str, message: str, notification_type: str = "info", link: str | None = None):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        link=link,
    )
    db.add(notification)
    await db.flush()
    from app.routers.ws import send_to_user
    await send_to_user(user_id, {
        "type": "notification",
        "data": {
            "id": str(notification.id),
            "user_id": str(notification.user_id),
            "title": notification.title,
            "message": notification.message,
            "notification_type": notification.notification_type,
            "link": notification.link,
            "is_read": notification.is_read,
            "created_at": notification.created_at.isoformat(),
        },
    })


def _to_response(app: Application) -> ApplicationResponse:
    data = {
        "id": app.id,
        "seeker_id": app.seeker_id,
        "job_posting_id": app.job_posting_id,
        "resume_id": app.resume_id,
        "status": app.status,
        "match_score": app.match_score,
        "applied_via": app.applied_via,
        "employer_notes": app.employer_notes,
        "interview_link": app.interview_link,
        "created_at": app.created_at,
        "updated_at": app.updated_at,
    }
    if app.job_posting:
        jp = app.job_posting
        data["job_posting"] = {
            "id": str(jp.id),
            "title": jp.title,
            "employer_id": str(jp.employer_id),
            "description": jp.description,
            "requirements": jp.requirements or [],
            "responsibilities": jp.responsibilities or [],
            "location": jp.location,
            "is_remote": jp.is_remote,
            "salary_min": jp.salary_min,
            "salary_max": jp.salary_max,
            "salary_currency": jp.salary_currency,
            "job_type": jp.job_type,
            "category": jp.category,
            "status": jp.status,
            "external_url": jp.external_url,
        }
    return ApplicationResponse.model_validate(data)

router = APIRouter(prefix="/api/v1/applications", tags=["applications"])


@router.get("")
async def list_my_applications(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base = (
        select(Application)
        .options(selectinload(Application.job_posting))
        .where(Application.seeker_id == current_user.id)
        .order_by(Application.created_at.desc())
    )
    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    result = await db.execute(base.offset((page - 1) * page_size).limit(page_size))
    apps = result.scalars().all()
    return make_page([_to_response(a) for a in apps], total, page, page_size)


@router.get("/job/{job_id}", response_model=list[ApplicationResponse])
async def list_applications_for_job(
    job_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job_result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job or job.employer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(
        select(Application)
        .options(selectinload(Application.job_posting))
        .where(Application.job_posting_id == job_id)
        .order_by(Application.created_at.desc())
    )
    return [_to_response(a) for a in result.scalars().all()]


@router.post("", response_model=ApplicationResponse)
async def create_application(
    data: ApplicationCreate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(Application).where(
            Application.seeker_id == current_user.id,
            Application.job_posting_id == data.job_posting_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already applied to this job")

    job_result = await db.execute(select(JobPosting).where(JobPosting.id == data.job_posting_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.employer_id == current_user.id:
        raise HTTPException(status_code=403, detail="You cannot apply to your own job posting")

    status = "applied"
    match_score_val = 0
    if data.resume_id and getattr(job, 'auto_screening_enabled', True):
        from app.models import MatchScore
        ms_res = await db.execute(
            select(MatchScore).where(
                MatchScore.resume_id == data.resume_id,
                MatchScore.job_posting_id == data.job_posting_id,
                MatchScore.direction == "seeker",
            )
        )
        ms = ms_res.scalar_one_or_none()
        if ms:
            match_score_val = ms.overall_score
        else:
            from starlette.concurrency import run_in_threadpool
            from app.models import Resume
            from app.services.matching import compute_match
            resume_result = await db.execute(select(Resume).where(Resume.id == data.resume_id))
            resume = resume_result.scalar_one_or_none()
            if resume:
                scores = await run_in_threadpool(
                    compute_match,
                    resume.raw_text,
                    resume.skills or [],
                    job.description,
                    job.requirements or [],
                )
                match_score_val = scores["overall_score"]
                db.add(MatchScore(
                    resume_id=data.resume_id,
                    job_posting_id=data.job_posting_id,
                    direction="seeker",
                    overall_score=scores["overall_score"],
                    keyword_score=scores["keyword_score"],
                    semantic_score=scores["semantic_score"],
                    gap_report=scores["gap_report"],
                ))
        if match_score_val >= getattr(job, 'auto_approve_threshold', 85):
            status = "shortlisted"
        elif match_score_val < getattr(job, 'auto_reject_threshold', 50):
            status = "rejected"

    app = Application(
        seeker_id=current_user.id,
        job_posting_id=data.job_posting_id,
        resume_id=data.resume_id,
        status=status,
        match_score=match_score_val,
        applied_via=data.applied_via,
    )
    app.job_posting = job
    db.add(app)
    await db.flush()
    await db.refresh(app)

    await _record_history(db, app.id, None, "applied", actor_id=current_user.id, reason="submitted")
    if status != "applied":
        await _record_history(db, app.id, "applied", status, actor_id=current_user.id, reason="auto_screen")
    await _notify(db, job.employer_id, "New application", f"{current_user.full_name} applied to \"{job.title}\"", "application", link=f"/app/applicants")
    if status != "applied":
        await _notify(db, current_user.id, "Application auto-screened", f"Your application for \"{job.title}\" was {status}.", "application", link="/app/applications")
        from app.services.email import send_application_status_email
        send_application_status_email(current_user.email, job.title, status)

    return _to_response(app)


@router.put("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: uuid.UUID,
    data: ApplicationUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Application)
        .options(selectinload(Application.job_posting))
        .where(Application.id == application_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Only employer who owns the job can update application status
    job_result = await db.execute(
        select(JobPosting).where(
            JobPosting.id == app.job_posting_id,
            JobPosting.employer_id == current_user.id,
        )
    )
    if not job_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not authorized")

    old_status = app.status
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(app, key, value)

    if "status" in data.model_dump(exclude_unset=True):
        job_result = await db.execute(select(JobPosting).where(JobPosting.id == app.job_posting_id))
        job = job_result.scalar_one_or_none()
        await _notify(
            db,
            app.seeker_id,
            "Application status updated",
            f"Your application for \"{job.title if job else 'a job'}\" is now {app.status}.",
            "application",
            link="/app/applications",
        )
        from app.services.email import send_application_status_email
        seeker_result = await db.execute(select(Profile).where(Profile.id == app.seeker_id))
        seeker = seeker_result.scalar_one_or_none()
        if seeker:
            send_application_status_email(seeker.email, job.title if job else "a job", app.status, app.employer_notes)
        await _record_history(db, app.id, old_status, app.status, actor_id=current_user.id,
                              reason="manual", notes=app.employer_notes)

    await db.flush()
    await db.refresh(app)
    return _to_response(app)


@router.get("/{application_id}/history", response_model=list[ApplicationHistoryResponse])
async def get_application_history(
    application_id: uuid.UUID,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ApplicationStatusHistory)
        .where(ApplicationStatusHistory.application_id == application_id)
        .order_by(ApplicationStatusHistory.created_at.asc())
    )
    return result.scalars().all()
