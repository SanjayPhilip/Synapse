from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
from uuid import UUID


class MatchScoreCreate(BaseModel):
    resume_id: UUID
    job_posting_id: UUID
    direction: str = "seeker"


class MatchScoreResponse(BaseModel):
    id: UUID
    resume_id: UUID
    job_posting_id: UUID
    direction: str
    overall_score: float
    keyword_score: float
    semantic_score: float
    gap_report: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MatchRequest(BaseModel):
    resume_id: Optional[UUID] = None
    job_description: Optional[str] = None
    job_requirements: list[str] = []
    job_posting_id: Optional[UUID] = None
    direction: str = "seeker"
