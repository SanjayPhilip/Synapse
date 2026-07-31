from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class AutoApplyLogCreate(BaseModel):
    job_posting_id: UUID
    resume_id: Optional[UUID] = None
    status: str = "pending"


class AutoApplyLogUpdate(BaseModel):
    status: Optional[str] = None
    error_message: Optional[str] = None
    screenshot_url: Optional[str] = None
    submitted_at: Optional[datetime] = None
    attempt_count: Optional[int] = None


class AutoApplyLogResponse(BaseModel):
    id: UUID
    seeker_id: UUID
    job_posting_id: UUID
    resume_id: Optional[UUID] = None
    status: str
    attempt_count: int
    error_message: Optional[str] = None
    screenshot_url: Optional[str] = None
    submitted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    job_posting: Optional[dict] = None

    class Config:
        from_attributes = True
