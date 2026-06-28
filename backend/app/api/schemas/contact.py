from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.schemas.user import UserResponse

class ContactAdd(BaseModel):
    identifier: str  # phone or username to find and add user
    nickname: Optional[str] = None

class ContactBlock(BaseModel):
    contact_user_id: str
    is_blocked: bool

class ContactResponse(BaseModel):
    id: str
    user_id: str
    contact_user_id: str
    nickname: Optional[str] = None
    is_blocked: bool
    created_at: datetime
    contact_user: UserResponse  # Expose nested contact user profile

    class Config:
        from_attributes = True
