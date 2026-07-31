from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
from app.database import get_db
from app.models import Profile
from app.middleware.auth import get_current_user
from app.config import get_settings

router = APIRouter(prefix="/api/v1/external-jobs", tags=["external_jobs"])
settings = get_settings()


async def search_adzuna(query: str, location: str = "", page: int = 1) -> list[dict]:
    if not settings.ADZUNA_APP_ID or not settings.ADZUNA_APP_KEY:
        return []
    url = f"https://api.adzuna.com/v1/api/jobs/us/search/{page}"
    params = {
        "app_id": settings.ADZUNA_APP_ID,
        "app_key": settings.ADZUNA_APP_KEY,
        "results_per_page": 10,
        "what": query,
        "content-type": "application/json",
    }
    if location:
        params["where"] = location

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            return [
                {
                    "title": r.get("title", ""),
                    "description": r.get("description", ""),
                    "location": r.get("location", {}).get("display_name", ""),
                    "company": r.get("company", {}).get("display_name", ""),
                    "url": r.get("redirect_url", ""),
                    "salary_min": r.get("salary_min"),
                    "salary_max": r.get("salary_max"),
                    "source": "adzuna",
                    "external_id": str(r.get("id", "")),
                }
                for r in data.get("results", [])
            ]
    except Exception:
        return []


async def search_jsearch(query: str, page: int = 1) -> list[dict]:
    if not settings.JSEARCH_API_KEY:
        return []
    url = "https://jsearch.p.rapidapi.com/search"
    headers = {
        "X-RapidAPI-Key": settings.JSEARCH_API_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    }
    params = {"query": query, "page": page, "num_pages": 1}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json()
            return [
                {
                    "title": r.get("job_title", ""),
                    "description": r.get("job_description", "")[:2000],
                    "location": r.get("job_city", "") + ", " + r.get("job_state", ""),
                    "company": r.get("employer_name", ""),
                    "url": r.get("job_apply_link", ""),
                    "salary_min": r.get("job_min_salary"),
                    "salary_max": r.get("job_max_salary"),
                    "source": "jsearch",
                    "external_id": r.get("job_id", ""),
                }
                for r in data.get("data", [])
            ]
    except Exception:
        return []


def _deduplicate(jobs: list[dict]) -> list[dict]:
    seen = set()
    unique = []
    for job in jobs:
        key = (job["title"].lower().strip(), job.get("company", "").lower().strip())
        if key not in seen:
            seen.add(key)
            unique.append(job)
    return unique


@router.get("/search")
async def search_external_jobs(
    query: str = Query(..., min_length=1),
    location: str = "",
    page: int = 1,
    current_user: Profile = Depends(get_current_user),
):
    adzuna_results = await search_adzuna(query, location, page)
    jsearch_results = await search_jsearch(query, page)
    all_results = adzuna_results + jsearch_results
    return _deduplicate(all_results)
