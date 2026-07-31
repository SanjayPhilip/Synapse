from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class RewriteSuggestionCreate(BaseModel):
    resume_id: UUID
    job_posting_id: UUID
    section_type: str
    original_text: str
    suggested_text: str
    reasoning: str


class RewriteSuggestionUpdate(BaseModel):
    status: Optional[str] = None
    user_edited_text: Optional[str] = None


class RewriteSuggestionResponse(BaseModel):
    id: UUID
    resume_id: UUID
    job_posting_id: UUID
    section_type: str
    original_text: str
    suggested_text: str
    reasoning: str
    status: str
    user_edited_text: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True
