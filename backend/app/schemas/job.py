from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class JobPostingCreate(BaseModel):
    title: str
    description: str
    requirements: list[str] = []
    responsibilities: list[str] = []
    location: Optional[str] = None
    is_remote: bool = False
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: str = "USD"
    job_type: Optional[str] = None
    category: Optional[str] = "Software Engineering"
    status: str = "active"


class JobPostingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[list[str]] = None
    responsibilities: Optional[list[str]] = None
    location: Optional[str] = None
    is_remote: Optional[bool] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    job_type: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None


class JobPostingResponse(BaseModel):
    id: UUID
    employer_id: UUID
    title: str
    description: str
    requirements: list[str]
    responsibilities: list[str]
    location: Optional[str] = None
    is_remote: bool
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: str
    job_type: Optional[str] = None
    category: Optional[str] = "Software Engineering"
    status: str
    external_source: Optional[str] = None
    external_id: Optional[str] = None
    external_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
