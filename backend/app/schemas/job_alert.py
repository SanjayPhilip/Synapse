from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class JobAlertCreate(BaseModel):
    keywords: List[str] = []
    category: Optional[str] = None
    location: Optional[str] = None


class JobAlertUpdate(BaseModel):
    keywords: Optional[List[str]] = None
    category: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None


class JobAlertResponse(BaseModel):
    id: UUID
    seeker_id: UUID
    keywords: List[str] = []
    category: Optional[str] = None
    location: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
