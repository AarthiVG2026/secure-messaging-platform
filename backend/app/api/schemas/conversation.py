from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.user import UserResponse

class ConversationMemberResponse(BaseModel):
    id: str
    conversation_id: str
    user_id: str
    is_admin: bool
    joined_at: datetime
    user: UserResponse

    class Config:
        from_attributes = True

class ConversationCreate(BaseModel):
    recipient_id: str  # For initiating 1-on-1 chats

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    member_ids: List[str]  # Initial list of user IDs to add (excluding the creator, who is added automatically)

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None

class DisappearingMessagesSettings(BaseModel):
    disappearing_seconds: Optional[int] = None  # Null to disable, otherwise seconds count

class LastMessageResponse(BaseModel):
    id: str
    sender_id: str
    text: Optional[str] = None
    message_type: str
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: str
    name: Optional[str] = None
    is_group: bool
    avatar_url: Optional[str] = None
    description: Optional[str] = None
    disappearing_seconds: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    members: List[ConversationMemberResponse] = []
    last_message: Optional[LastMessageResponse] = None
    unread_count: int = 0

    class Config:
        from_attributes = True
