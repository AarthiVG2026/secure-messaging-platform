from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from app.models.conversation import Conversation, ConversationMember, UserSession
from app.models.message import Message

def get_conversation_by_id(db: Session, conversation_id: str) -> Optional[Conversation]:
    return db.query(Conversation).filter(Conversation.id == conversation_id).first()

def get_1on1_conversation(db: Session, user_id_1: str, user_id_2: str) -> Optional[Conversation]:
    # A 1on1 conversation has is_group = False, and has exactly user_id_1 and user_id_2 as members
    # Find all conversations that are not groups and have user_id_1 as member
    convs = db.query(Conversation).filter(Conversation.is_group == False).join(
        ConversationMember, Conversation.id == ConversationMember.conversation_id
    ).filter(ConversationMember.user_id == user_id_1).all()
    
    # Filter those that also have user_id_2 as member
    for conv in convs:
        member_ids = [m.user_id for m in conv.members]
        if len(member_ids) == 2 and user_id_2 in member_ids:
            return conv
    return None

def create_conversation(db: Session, is_group: bool = False, name: Optional[str] = None, description: Optional[str] = None, avatar_url: Optional[str] = None, disappearing_seconds: Optional[int] = None) -> Conversation:
    db_conv = Conversation(
        is_group=is_group,
        name=name,
        description=description,
        avatar_url=avatar_url,
        disappearing_seconds=disappearing_seconds
    )
    db.add(db_conv)
    db.commit()
    db.refresh(db_conv)
    return db_conv

def add_conversation_member(db: Session, conversation_id: str, user_id: str, is_admin: bool = False) -> ConversationMember:
    db_member = ConversationMember(
        conversation_id=conversation_id,
        user_id=user_id,
        is_admin=is_admin
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member

def remove_conversation_member(db: Session, conversation_id: str, user_id: str) -> bool:
    db_member = db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == user_id
    ).first()
    if db_member:
        db.delete(db_member)
        db.commit()
        return True
    return False

def get_conversation_member(db: Session, conversation_id: str, user_id: str) -> Optional[ConversationMember]:
    return db.query(ConversationMember).filter(
        ConversationMember.conversation_id == conversation_id,
        ConversationMember.user_id == user_id
    ).first()

def update_conversation(db: Session, conversation_id: str, name: Optional[str] = None, description: Optional[str] = None, avatar_url: Optional[str] = None, disappearing_seconds: Optional[int] = None) -> Optional[Conversation]:
    db_conv = get_conversation_by_id(db, conversation_id)
    if not db_conv:
        return None
    
    if name is not None:
        db_conv.name = name
    if description is not None:
        db_conv.description = description
    if avatar_url is not None:
        db_conv.avatar_url = avatar_url
    if disappearing_seconds is not None:
        db_conv.disappearing_seconds = disappearing_seconds
        
    db_conv.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_conv)
    return db_conv

def get_user_conversations(db: Session, user_id: str) -> List[Conversation]:
    # Find all conversations the user is part of, sorted by updated_at desc
    return db.query(Conversation).join(
        ConversationMember, Conversation.id == ConversationMember.conversation_id
    ).filter(
        ConversationMember.user_id == user_id
    ).order_by(
        Conversation.updated_at.desc()
    ).options(
        joinedload(Conversation.members).joinedload(ConversationMember.user)
    ).all()

# Session operations
def create_session(db: Session, user_id: str, refresh_token: str, expires_at: datetime) -> UserSession:
    db_session = UserSession(
        user_id=user_id,
        refresh_token=refresh_token,
        expires_at=expires_at
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_session_by_token(db: Session, refresh_token: str) -> Optional[UserSession]:
    return db.query(UserSession).filter(UserSession.refresh_token == refresh_token).first()

def delete_session(db: Session, refresh_token: str) -> bool:
    db_session = get_session_by_token(db, refresh_token)
    if db_session:
        db.delete(db_session)
        db.commit()
        return True
    return False
