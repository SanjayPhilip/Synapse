from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class ChatSessionCreate(BaseModel):
    role_context: str = "seeker"
    module_context: Optional[str] = None


class ChatSessionResponse(BaseModel):
    id: UUID
    user_id: UUID
    role_context: str
    module_context: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatMessageCreate(BaseModel):
    content: str


class ChatMessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    module_routed: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
