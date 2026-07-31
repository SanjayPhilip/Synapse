from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class SavedJobCreate(BaseModel):
    job_posting_id: UUID
    match_score_at_save: Optional[float] = None


class SavedJobResponse(BaseModel):
    id: UUID
    seeker_id: UUID
    job_posting_id: UUID
    match_score_at_save: Optional[float] = None
    created_at: datetime
    job_posting: Optional[dict] = None

    class Config:
        from_attributes = True
