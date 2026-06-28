from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.conversation import ConversationCreate, ConversationResponse, LastMessageResponse, DisappearingMessagesSettings
from app.schemas.message import MessageResponse
from app.repositories import conversation as conv_repo
from app.repositories import message as msg_repo
from app.repositories import user as user_repo

router = APIRouter(prefix="/conversations", tags=["conversations"])

@router.get("", response_model=List[ConversationResponse])
def list_user_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conversations = conv_repo.get_user_conversations(db, current_user.id)
    
    response = []
    for conv in conversations:
        # Fetch unread count
        unread = msg_repo.get_unread_message_count(db, conv.id, current_user.id)
        # Fetch last message
        last_msg = msg_repo.get_last_message(db, conv.id)
        
        last_msg_response = None
        if last_msg:
            last_msg_response = LastMessageResponse(
                id=last_msg.id,
                sender_id=last_msg.sender_id,
                text=last_msg.text,
                message_type=last_msg.message_type,
                created_at=last_msg.created_at
            )
            
        conv_res = ConversationResponse(
            id=conv.id,
            name=conv.name,
            is_group=conv.is_group,
            avatar_url=conv.avatar_url,
            description=conv.description,
            disappearing_seconds=conv.disappearing_seconds,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            members=conv.members,
            last_message=last_msg_response,
            unread_count=unread
        )
        response.append(conv_res)
        
    return response

@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def start_conversation(
    conv_in: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if recipient exists
    recipient = user_repo.get_user_by_id(db, conv_in.recipient_id)
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_444_NOT_FOUND if hasattr(status, "HTTP_444_NOT_FOUND") else 404,
            detail="Recipient user not found."
        )
        
    # Check if 1on1 conversation already exists
    existing = conv_repo.get_1on1_conversation(db, current_user.id, recipient.id)
    if existing:
        # Load details
        unread = msg_repo.get_unread_message_count(db, existing.id, current_user.id)
        last_msg = msg_repo.get_last_message(db, existing.id)
        last_msg_res = LastMessageResponse.model_validate(last_msg) if last_msg else None
        
        return ConversationResponse(
            id=existing.id,
            name=existing.name,
            is_group=existing.is_group,
            avatar_url=existing.avatar_url,
            description=existing.description,
            disappearing_seconds=existing.disappearing_seconds,
            created_at=existing.created_at,
            updated_at=existing.updated_at,
            members=existing.members,
            last_message=last_msg_res,
            unread_count=unread
        )
        
    # Create new 1on1 conversation
    conv = conv_repo.create_conversation(db, is_group=False)
    # Add members
    conv_repo.add_conversation_member(db, conversation_id=conv.id, user_id=current_user.id)
    conv_repo.add_conversation_member(db, conversation_id=conv.id, user_id=recipient.id)
    
    # Reload conversation with members
    db.refresh(conv)
    return ConversationResponse(
        id=conv.id,
        is_group=False,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        members=conv.members,
        last_message=None,
        unread_count=0
    )

@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
def get_messages(
    conversation_id: str,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check membership
    member = conv_repo.get_conversation_member(db, conversation_id, current_user.id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this conversation."
        )
        
    messages = msg_repo.get_conversation_messages(db, conversation_id, limit=limit, offset=offset)
    # Return chronologically (newest at bottom on client, but retrieved from DB in desc, let's reverse them or return desc and let client handle reversing)
    # The schemas expect MessageResponse, which holds status and attachments
    return messages

@router.put("/{conversation_id}/disappearing-messages", response_model=ConversationResponse)
def set_disappearing_timer(
    conversation_id: str,
    settings_in: DisappearingMessagesSettings,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    member = conv_repo.get_conversation_member(db, conversation_id, current_user.id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this conversation."
        )
        
    updated_conv = conv_repo.update_conversation(
        db, 
        conversation_id=conversation_id, 
        disappearing_seconds=settings_in.disappearing_seconds
    )
    
    # Create system message announcing the change
    duration_str = "Off"
    if settings_in.disappearing_seconds:
        secs = settings_in.disappearing_seconds
        if secs < 60:
            duration_str = f"{secs} seconds"
        elif secs < 3600:
            duration_str = f"{secs // 60} minutes"
        else:
            duration_str = f"{secs // 3600} hours"
            
    msg_repo.create_message(
        db,
        conversation_id=conversation_id,
        sender_id=current_user.id,
        text=f"{current_user.display_name} set disappearing messages to {duration_str}.",
        message_type="system"
    )
    
    # Return reloaded conv
    unread = msg_repo.get_unread_message_count(db, updated_conv.id, current_user.id)
    last_msg = msg_repo.get_last_message(db, updated_conv.id)
    last_msg_res = LastMessageResponse.model_validate(last_msg) if last_msg else None
    
    return ConversationResponse(
        id=updated_conv.id,
        name=updated_conv.name,
        is_group=updated_conv.is_group,
        avatar_url=updated_conv.avatar_url,
        description=updated_conv.description,
        disappearing_seconds=updated_conv.disappearing_seconds,
        created_at=updated_conv.created_at,
        updated_at=updated_conv.updated_at,
        members=updated_conv.members,
        last_message=last_msg_res,
        unread_count=unread
    )
