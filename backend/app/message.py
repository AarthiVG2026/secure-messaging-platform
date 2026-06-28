from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from app.schemas.user import UserResponse

class AttachmentCreate(BaseModel):
    file_url: str
    file_type: str
    file_size: int

class AttachmentResponse(BaseModel):
    id: str
    message_id: str
    file_url: str
    file_type: str
    file_size: int

    class Config:
        from_attributes = True

class MessageStatusResponse(BaseModel):
    id: str
    message_id: str
    user_id: str
    status: str  # "sent", "delivered", "read"
    updated_at: datetime

    class Config:
        from_attributes = True

class QuotedMessageResponse(BaseModel):
    id: str
    sender_id: str
    text: Optional[str] = None
    message_type: str
    created_at: datetime
    sender: UserResponse

    class Config:
        from_attributes = True

class ReactionResponse(BaseModel):
    id: str
    message_id: str
    user_id: str
    emoji: str
    created_at: datetime

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    text: Optional[str] = None
    parent_message_id: Optional[str] = None
    message_type: str = "text"  # "text", "system", "attachment"
    attachment: Optional[AttachmentCreate] = None
    client_msg_id: Optional[str] = None  # Temporary ID from client for optimistic updates mapping

class ReactionCreate(BaseModel):
    emoji: str

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    text: Optional[str] = None
    parent_message_id: Optional[str] = None
    message_type: str
    disappearing_at: Optional[datetime] = None
    created_at: datetime
    sender: UserResponse
    parent_message: Optional[QuotedMessageResponse] = None
    attachments: List[AttachmentResponse] = []
    statuses: List[MessageStatusResponse] = []
    reactions: List[ReactionResponse] = []

    class Config:
        from_attributes = True

class MessageEdit(BaseModel):
    text: str
