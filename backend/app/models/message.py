import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Enum
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    text = Column(String, nullable=True)  # Can hold base64 obfuscated text payload to simulate encryption
    parent_message_id = Column(String, ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)  # For quote-replies
    message_type = Column(String, default="text", nullable=False)  # "text", "system", "attachment"
    disappearing_at = Column(DateTime, nullable=True)  # Deletion threshold time
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    
    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages")
    
    # Self-referential relationship for quoted messages
    parent_message = relationship("Message", remote_side=[id], foreign_keys=[parent_message_id])
    
    attachments = relationship("Attachment", back_populates="message", cascade="all, delete-orphan")
    statuses = relationship("MessageStatus", back_populates="message", cascade="all, delete-orphan")
    reactions = relationship("MessageReaction", back_populates="message", cascade="all, delete-orphan")

class Attachment(Base):
    __tablename__ = "attachments"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    message_id = Column(String, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    file_url = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # "image/png", "application/pdf", etc.
    file_size = Column(Integer, nullable=False)
    
    # Relationships
    message = relationship("Message", back_populates="attachments")

class MessageStatus(Base):
    __tablename__ = "message_statuses"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    message_id = Column(String, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="sent", nullable=False)  # "sent", "delivered", "read"
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    message = relationship("Message", back_populates="statuses")
    user = relationship("User", back_populates="received_statuses")

class MessageReaction(Base):
    __tablename__ = "message_reactions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    message_id = Column(String, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    emoji = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    message = relationship("Message", back_populates="reactions")
    user = relationship("User")
