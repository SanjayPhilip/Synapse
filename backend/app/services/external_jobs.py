import asyncio
from datetime import datetime
from typing import Any

import httpx
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import ExternalJob

ADZUNA_URL = "https://api.adzuna.com/v1/api/jobs/us/search/1"
JSEARCH_URL = "https://jsearch.p.rapidapi.com/search"

_REQ_KEYWORDS = (
    "experience", "knowledge", "skill", "degree", "proficiency", "familiar",
    "expert", "ability", "design", "develop", "build", "maintain", "sql",
    "python", "aws", "communication", "team", "deliver", "agile", "cloud",
)


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _extract_requirements(description: str, limit: int = 8) -> list[str]:
    reqs = []
    for line in (l.strip() for l in description.splitlines()):
        if not line or len(line) > 200:
            continue
        if any(k in line.lower() for k in _REQ_KEYWORDS):
            reqs.append(line.lstrip("-•· ").strip())
        if len(reqs) >= limit:
            break
    return reqs


def _normalize_adzuna(raw: dict) -> dict:
    company = (raw.get("company") or {}).get("display_name")
    loc = raw.get("location") or {}
    loc_name = loc.get("display_name") if isinstance(loc, dict) else str(loc or "")
    return {
        "external_source": "adzuna",
        "external_id": str(raw.get("id", "")),
        "title": raw.get("title", ""),
        "company": company,
        "description": raw.get("description", ""),
        "requirements": _extract_requirements(raw.get("description", "")),
        "location": loc_name,
        "is_remote": "remote" in loc_name.lower(),
        "salary_min": raw.get("salary_min"),
        "salary_max": raw.get("salary_max"),
        "salary_currency": "USD",
        "job_type": raw.get("contract_time"),
        "category": (raw.get("category") or {}).get("label"),
        "external_url": raw.get("redirect_url"),
        "posted_at": _parse_iso(raw.get("created")),
    }


def _normalize_jsearch(raw: dict) -> dict:
    city = raw.get("job_city")
    country = raw.get("job_country")
    return {
        "external_source": "jsearch",
        "external_id": raw.get("job_id", ""),
        "title": raw.get("job_title", ""),
        "company": raw.get("employer_name"),
        "description": raw.get("job_description", ""),
        "requirements": _extract_requirements(raw.get("job_description", "")),
        "location": ", ".join(x for x in [city, country] if x) or None,
        "is_remote": bool(raw.get("job_is_remote")),
        "salary_min": raw.get("job_min_salary"),
        "salary_max": raw.get("job_max_salary"),
        "salary_currency": raw.get("job_salary_currency") or "USD",
        "job_type": (raw.get("job_employment_type") or "").lower(),
        "category": None,
        "external_url": raw.get("job_apply_link"),
        "posted_at": _parse_iso(raw.get("job_posted_at_datetime_utc")),
    }


async def fetch_adzuna_jobs(q: str, location: str | None, limit: int = 20) -> list[dict]:
    settings = get_settings()
    params: dict[str, Any] = {
        "app_id": settings.ADZUNA_APP_ID,
        "app_key": settings.ADZUNA_APP_KEY,
        "what": q,
        "results_per_page": limit,
        "content-type": "application/json",
    }
    if location:
        params["where"] = location
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(ADZUNA_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
    return [_normalize_adzuna(item) for item in data.get("results", [])]


async def fetch_jsearch_jobs(q: str, location: str | None, limit: int = 20) -> list[dict]:
    settings = get_settings()
    query = f"{q} in {location}" if location else q
    headers = {
        "x-rapidapi-key": settings.JSEARCH_API_KEY,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
    }
    params = {"query": query, "num_pages": 1, "page": 1}
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(JSEARCH_URL, params=params, headers=headers)
        resp.raise_for_status()
        data = resp.json()
    return [_normalize_jsearch(item) for item in data.get("data", [])]


async def upsert_external_jobs(db: AsyncSession, jobs: list[dict]) -> list[ExternalJob]:
    now = datetime.utcnow()
    rows = []
    for job in jobs:
        result = await db.execute(
            select(ExternalJob).where(
                ExternalJob.external_source == job["external_source"],
                ExternalJob.external_id == job["external_id"],
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            row = ExternalJob(**job)
            db.add(row)
        else:
            for key, value in job.items():
                if value is not None:
                    setattr(row, key, value)
        row.fetched_at = now
        row.is_active = True
        rows.append(row)
    await db.flush()
    return rows


async def search_external_jobs(
    db: AsyncSession, q: str, location: str | None, limit: int = 20
) -> tuple[list[ExternalJob], bool]:
    settings = get_settings()
    fetchers = []
    if settings.ADZUNA_APP_ID and settings.ADZUNA_APP_KEY:
        fetchers.append(fetch_adzuna_jobs(q, location, limit))
    if settings.JSEARCH_API_KEY:
        fetchers.append(fetch_jsearch_jobs(q, location, limit))

    if fetchers:
        results = await asyncio.gather(*fetchers, return_exceptions=True)
        fresh = [item for res in results if not isinstance(res, Exception) for item in res]
        if fresh:
            rows = await upsert_external_jobs(db, fresh)
            return rows[:limit], False

    filters = [ExternalJob.is_active == True]  # noqa: E712
    if q:
        filters.append(
            or_(
                ExternalJob.title.ilike(f"%{q}%"),
                ExternalJob.description.ilike(f"%{q}%"),
                ExternalJob.company.ilike(f"%{q}%"),
            )
        )
    if location:
        filters.append(ExternalJob.location.ilike(f"%{location}%"))
    cached = await db.execute(
        select(ExternalJob)
        .where(*filters)
        .order_by(
            ExternalJob.posted_at.is_(None),
            ExternalJob.posted_at.desc(),
            ExternalJob.fetched_at.desc(),
        )
        .limit(limit)
    )
    return list(cached.scalars().all()), True
