from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models import DEFAULT_NOTIFICATION_PREFS


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    bio: Optional[str] = None
    headline: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None
    theme: Optional[str] = None
    locale: Optional[str] = None
    notification_prefs: Optional[dict] = None


class ProfileResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    company_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    headline: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None
    theme: str = "dark"
    locale: str = "en"
    notification_prefs: dict = {}
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AvatarUploadResponse(BaseModel):
    url: str
