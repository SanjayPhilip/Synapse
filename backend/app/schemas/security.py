from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from uuid import UUID


class SessionTokenResponse(BaseModel):
    id: UUID
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime
    last_used_at: Optional[datetime] = None
    expires_at: datetime
    is_current: bool = False

    class Config:
        from_attributes = True


class EmailChangeRequest(BaseModel):
    new_email: EmailStr


class EmailChangeConfirm(BaseModel):
    token: str


class DeleteAccountRequest(BaseModel):
    password: str
    confirm: bool