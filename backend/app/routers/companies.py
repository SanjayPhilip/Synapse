import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models import CompanyProfile, JobPosting, Profile
from app.schemas.company import CompanyProfileCreate, CompanyProfileUpdate, CompanyProfileResponse
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/v1/companies", tags=["companies"])


def _slugify(text: str) -> str:
    cleaned = re.sub(r'[^a-zA-Z0-9\s-]', '', text).strip().lower()
    return re.sub(r'[\s-]+', '-', cleaned)


@router.get("", response_model=list[CompanyProfileResponse])
async def list_companies(
    q: str | None = None,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CompanyProfile)
    if q:
        stmt = stmt.where(CompanyProfile.company_name.ilike(f"%{q}%"))
    stmt = stmt.order_by(CompanyProfile.company_name.asc()).limit(limit)
    res = await db.execute(stmt)
    companies = res.scalars().all()
    
    out = []
    for c in companies:
        jobs_res = await db.execute(
            select(func.count(JobPosting.id)).where(
                JobPosting.employer_id == c.employer_id,
                JobPosting.status == "active"
            )
        )
        active_count = jobs_res.scalar() or 0
        resp = CompanyProfileResponse.model_validate(c)
        resp.active_jobs_count = active_count
        out.append(resp)
    return out


@router.get("/me", response_model=CompanyProfileResponse)
async def get_my_company(
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(CompanyProfile).where(CompanyProfile.employer_id == current_user.id))
    company = res.scalar_one_or_none()
    if not company:
        # Create default from profile if employer
        slug_base = _slugify(current_user.company_name or current_user.full_name or "company")
        company = CompanyProfile(
            employer_id=current_user.id,
            company_name=current_user.company_name or f"{current_user.full_name}'s Org",
            slug=f"{slug_base}-{str(current_user.id)[:6]}",
            overview=current_user.bio or "Innovative company hiring top talent on Synapse.",
            website=current_user.website or "",
            logo_url=current_user.avatar_url or "",
            headquarters=current_user.location or "Remote",
            perks=["Flexible Hours", "Health Insurance", "Remote Work Options", "Continuous Learning"],
            culture=["Innovation-first", "Inclusive & Collaborative", "Fast-paced"],
            social_links={"linkedin": current_user.linkedin or ""}
        )
        db.add(company)
        await db.flush()
        await db.refresh(company)

    jobs_res = await db.execute(
        select(func.count(JobPosting.id)).where(
            JobPosting.employer_id == current_user.id,
            JobPosting.status == "active"
        )
    )
    active_count = jobs_res.scalar() or 0
    resp = CompanyProfileResponse.model_validate(company)
    resp.active_jobs_count = active_count
    return resp


@router.put("/me", response_model=CompanyProfileResponse)
async def update_my_company(
    data: CompanyProfileUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(CompanyProfile).where(CompanyProfile.employer_id == current_user.id))
    company = res.scalar_one_or_none()
    if not company:
        slug_base = _slugify(data.company_name or current_user.company_name or "company")
        company = CompanyProfile(
            employer_id=current_user.id,
            company_name=data.company_name or "My Company",
            slug=f"{slug_base}-{str(current_user.id)[:6]}",
        )
        db.add(company)
        await db.flush()

    for k, v in data.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(company, k, v)

    await db.flush()
    await db.refresh(company)

    jobs_res = await db.execute(
        select(func.count(JobPosting.id)).where(
            JobPosting.employer_id == current_user.id,
            JobPosting.status == "active"
        )
    )
    active_count = jobs_res.scalar() or 0
    resp = CompanyProfileResponse.model_validate(company)
    resp.active_jobs_count = active_count
    return resp


@router.get("/{slug_or_id}", response_model=CompanyProfileResponse)
async def get_company(
    slug_or_id: str,
    db: AsyncSession = Depends(get_db),
):
    is_uuid = False
    try:
        u = uuid.UUID(slug_or_id)
        is_uuid = True
    except ValueError:
        pass

    if is_uuid:
        stmt = select(CompanyProfile).where(
            (CompanyProfile.id == u) | (CompanyProfile.employer_id == u)
        )
    else:
        stmt = select(CompanyProfile).where(CompanyProfile.slug == slug_or_id)

    res = await db.execute(stmt)
    company = res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    jobs_res = await db.execute(
        select(func.count(JobPosting.id)).where(
            JobPosting.employer_id == company.employer_id,
            JobPosting.status == "active"
        )
    )
    active_count = jobs_res.scalar() or 0
    resp = CompanyProfileResponse.model_validate(company)
    resp.active_jobs_count = active_count
    return resp
