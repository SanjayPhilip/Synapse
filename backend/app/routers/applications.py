import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Application, JobPosting, Profile
from app.schemas.application import ApplicationCreate, ApplicationUpdate, ApplicationResponse
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/applications", tags=["applications"])


@router.get("", response_model=list[ApplicationResponse])
async def list_my_applications(
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Application)
        .options(selectinload(Application.job_posting))
        .where(Application.seeker_id == current_user.id)
        .order_by(Application.created_at.desc())
    )
    apps = result.scalars().all()
    out = []
    for a in apps:
        d = ApplicationResponse.model_validate(a)
        if a.job_posting:
            d.job_posting = {
                "id": str(a.job_posting.id),
                "title": a.job_posting.title,
                "employer_id": str(a.job_posting.employer_id),
                "location": a.job_posting.location,
                "job_type": a.job_posting.job_type,
            }
        out.append(d)
    return out


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
        select(Application).where(Application.job_posting_id == job_id).order_by(Application.created_at.desc())
    )
    return result.scalars().all()


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

    app = Application(
        seeker_id=current_user.id,
        job_posting_id=data.job_posting_id,
        resume_id=data.resume_id,
        applied_via=data.applied_via,
    )
    db.add(app)
    await db.flush()
    await db.refresh(app)
    return app


@router.put("/{application_id}", response_model=ApplicationResponse)
async def update_application(
    application_id: uuid.UUID,
    data: ApplicationUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Application).where(Application.id == application_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.seeker_id != current_user.id:
        job_result = await db.execute(
            select(JobPosting).where(
                JobPosting.id == app.job_posting_id,
                JobPosting.employer_id == current_user.id,
            )
        )
        if not job_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not authorized")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(app, key, value)
    await db.flush()
    await db.refresh(app)
    return app
