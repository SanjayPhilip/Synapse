from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class ExternalJobResponse(BaseModel):
    id: UUID
    external_source: str
    external_id: str
    title: str
    company: Optional[str] = None
    description: str
    requirements: list[str] = []
    location: Optional[str] = None
    is_remote: bool = False
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: str = "USD"
    job_type: Optional[str] = None
    category: Optional[str] = None
    external_url: Optional[str] = None
    posted_at: Optional[datetime] = None
    fetched_at: datetime

    class Config:
        from_attributes = True


class ExternalJobSearchResponse(BaseModel):
    stale: bool
    jobs: list[ExternalJobResponse]
