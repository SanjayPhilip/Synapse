from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
from uuid import UUID


class ResumeCreate(BaseModel):
    file_name: str
    file_type: Optional[str] = None
    parsed_data: dict = {}
    raw_text: str = ""
    skills: list[str] = []
    version: int = 1
    is_current: bool = True


class ResumeUpdate(BaseModel):
    file_name: Optional[str] = None
    parsed_data: Optional[dict] = None
    raw_text: Optional[str] = None
    skills: Optional[list[str]] = None
    is_current: Optional[bool] = None


class ResumeResponse(BaseModel):
    id: UUID
    user_id: UUID
    file_name: str
    file_type: Optional[str] = None
    parsed_data: dict
    raw_text: str
    skills: list[str]
    version: int
    is_current: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
