from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class ApplicationCreate(BaseModel):
    job_posting_id: UUID
    resume_id: Optional[UUID] = None
    applied_via: str = "platform"


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    employer_notes: Optional[str] = None


class ApplicationHistoryResponse(BaseModel):
    id: UUID
    application_id: UUID
    old_status: Optional[str] = None
    new_status: str
    changed_by: Optional[UUID] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ApplicationResponse(BaseModel):
    id: UUID
    seeker_id: UUID
    job_posting_id: UUID
    resume_id: Optional[UUID] = None
    status: str
    match_score: Optional[float] = None
    applied_via: str
    employer_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    job_posting: Optional[dict] = None

    class Config:
        from_attributes = True
