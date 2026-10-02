from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


class CompanyProfileBase(BaseModel):
    company_name: str
    slug: Optional[str] = None
    tagline: Optional[str] = None
    overview: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    headquarters: Optional[str] = None
    perks: List[str] = []
    culture: List[str] = []
    social_links: Dict[str, str] = {}


class CompanyProfileCreate(CompanyProfileBase):
    pass


class CompanyProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    slug: Optional[str] = None
    tagline: Optional[str] = None
    overview: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    headquarters: Optional[str] = None
    perks: Optional[List[str]] = None
    culture: Optional[List[str]] = None
    social_links: Optional[Dict[str, str]] = None


class CompanyProfileResponse(CompanyProfileBase):
    id: UUID
    employer_id: UUID
    slug: str
    created_at: datetime
    updated_at: datetime
    active_jobs_count: Optional[int] = 0

    class Config:
        from_attributes = True
