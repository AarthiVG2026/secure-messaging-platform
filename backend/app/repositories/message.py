from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, not_
from app.models.message import Message, Attachment, MessageStatus, MessageReaction
from app.models.conversation import Conversation

def get_message_by_id(db: Session, message_id: str) -> Optional[Message]:
    return db.query(Message).filter(Message.id == message_id).options(
        joinedload(Message.sender),
        joinedload(Message.attachments),
        joinedload(Message.statuses),
        joinedload(Message.reactions)
    ).first()

def create_message(db: Session, conversation_id: str, sender_id: str, text: Optional[str] = None, message_type: str = "text", parent_message_id: Optional[str] = None, disappearing_at: Optional[datetime] = None) -> Message:
    db_message = Message(
        conversation_id=conversation_id,
        sender_id=sender_id,
        text=text,
        message_type=message_type,
        parent_message_id=parent_message_id,
        disappearing_at=disappearing_at
    )
    db.add(db_message)
    
    # Touch conversation updated_at for sorting
    db_conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if db_conv:
        db_conv.updated_at = datetime.now(timezone.utc)
        
    db.commit()
    db.refresh(db_message)
    return db_message

def create_attachment(db: Session, message_id: str, file_url: str, file_type: str, file_size: int) -> Attachment:
    db_attachment = Attachment(
        message_id=message_id,
        file_url=file_url,
        file_type=file_type,
        file_size=file_size
    )
    db.add(db_attachment)
    db.commit()
    db.refresh(db_attachment)
    return db_attachment

def get_conversation_messages(db: Session, conversation_id: str, limit: int = 50, offset: int = 0) -> List[Message]:
    return db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(
        Message.created_at.desc()
    ).options(
        joinedload(Message.sender),
        joinedload(Message.attachments),
        joinedload(Message.statuses),
        joinedload(Message.parent_message),
        joinedload(Message.reactions)
    ).limit(limit).offset(offset).all()

def set_message_status(db: Session, message_id: str, user_id: str, status: str) -> MessageStatus:
    db_status = db.query(MessageStatus).filter(
        MessageStatus.message_id == message_id,
        MessageStatus.user_id == user_id
    ).first()
    
    if db_status:
        db_status.status = status
        db_status.updated_at = datetime.now(timezone.utc)
    else:
        db_status = MessageStatus(
            message_id=message_id,
            user_id=user_id,
            status=status
        )
        db.add(db_status)
        
    db.commit()
    db.refresh(db_status)
    return db_status

def get_unread_message_count(db: Session, conversation_id: str, user_id: str) -> int:
    from sqlalchemy import select
    # Select statement to find message IDs in this conversation that this user has marked as 'read'
    read_message_ids = select(MessageStatus.message_id).filter(
        MessageStatus.user_id == user_id,
        MessageStatus.status == "read"
    )
    
    # Count messages not sent by the user, in the conversation, that are not in the read set
    return db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != user_id,
        not_(Message.id.in_(read_message_ids))
    ).count()

def get_last_message(db: Session, conversation_id: str) -> Optional[Message]:
    return db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at.desc()).first()

def edit_message(db: Session, message_id: str, new_text: str) -> Optional[Message]:
    db_message = db.query(Message).filter(Message.id == message_id).first()
    if db_message:
        db_message.text = new_text
        db.commit()
        db.refresh(db_message)
    return db_message

def delete_message(db: Session, message_id: str) -> bool:
    db_message = db.query(Message).filter(Message.id == message_id).first()
    if db_message:
        # Soft delete message by swapping text and making it a system text message
        db_message.text = "This message was deleted."
        db_message.message_type = "system"
        db.commit()
        return True
    return False

def hard_delete_message(db: Session, message_id: str) -> bool:
    db_message = db.query(Message).filter(Message.id == message_id).first()
    if db_message:
        db.delete(db_message)
        db.commit()
        return True
    return False

def delete_expired_disappearing_messages(db: Session) -> int:
    # Deletes all messages where disappearing_at < current_time
    now = datetime.now(timezone.utc)
    expired_messages = db.query(Message).filter(
        Message.disappearing_at.is_not(None),
        Message.disappearing_at < now
    ).all()
    
    count = len(expired_messages)
    for msg in expired_messages:
        db.delete(msg)
    
    if count > 0:
        db.commit()
    return count

def toggle_reaction(db: Session, message_id: str, user_id: str, emoji: str) -> Optional[MessageReaction]:
    reaction = db.query(MessageReaction).filter(
        MessageReaction.message_id == message_id,
        MessageReaction.user_id == user_id
    ).first()
    
    if reaction:
        if reaction.emoji == emoji:
            # Same emoji, remove it (toggle off)
            db.delete(reaction)
            db.commit()
            return None
        else:
            # Different emoji, update it
            reaction.emoji = emoji
            db.commit()
            db.refresh(reaction)
            return reaction
    else:
        # Create new reaction
        new_reaction = MessageReaction(
            message_id=message_id,
            user_id=user_id,
            emoji=emoji
        )
        db.add(new_reaction)
        db.commit()
        db.refresh(new_reaction)
        return new_reaction
