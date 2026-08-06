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
    auto_screening_enabled: Optional[bool] = True
    auto_approve_threshold: Optional[int] = 85
    auto_reject_threshold: Optional[int] = 50
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
    auto_screening_enabled: Optional[bool] = None
    auto_approve_threshold: Optional[int] = None
    auto_reject_threshold: Optional[int] = None
    status: Optional[str] = None
    external_source: Optional[str] = None
    external_id: Optional[str] = None
    external_url: Optional[str] = None


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
    auto_screening_enabled: bool = True
    auto_approve_threshold: int = 85
    auto_reject_threshold: int = 50
    status: str
    moderation_status: str = "approved"
    external_source: Optional[str] = None
    external_id: Optional[str] = None
    external_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
