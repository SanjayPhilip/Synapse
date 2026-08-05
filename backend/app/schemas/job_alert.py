from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class JobAlertCreate(BaseModel):
    keywords: List[str] = []
    category: Optional[str] = None
    location: Optional[str] = None
    frequency: str = "daily"
    email_enabled: bool = True


class JobAlertUpdate(BaseModel):
    keywords: Optional[List[str]] = None
    category: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None
    frequency: Optional[str] = None
    email_enabled: Optional[bool] = None


class JobAlertResponse(BaseModel):
    id: UUID
    seeker_id: UUID
    keywords: List[str] = []
    category: Optional[str] = None
    location: Optional[str] = None
    is_active: bool
    frequency: str = "daily"
    email_enabled: bool = True
    last_checked: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
