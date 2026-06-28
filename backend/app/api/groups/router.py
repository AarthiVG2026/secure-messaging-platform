from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.conversation import GroupCreate, GroupUpdate, ConversationResponse, LastMessageResponse
from app.repositories import conversation as conv_repo
from app.repositories import message as msg_repo
from app.repositories import user as user_repo

router = APIRouter(prefix="/groups", tags=["groups"])

@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_group_chat(
    group_in: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Create group conversation
    conv = conv_repo.create_conversation(
        db,
        is_group=True,
        name=group_in.name,
        description=group_in.description,
        avatar_url=group_in.avatar_url
    )
    
    # 2. Add creator as admin member
    conv_repo.add_conversation_member(db, conversation_id=conv.id, user_id=current_user.id, is_admin=True)
    
    # 3. Add initial members
    for uid in group_in.member_ids:
        # Check that member is not the current user (already added)
        if uid != current_user.id:
            conv_repo.add_conversation_member(db, conversation_id=conv.id, user_id=uid, is_admin=False)
            
    # 4. Generate system message for group creation
    msg_repo.create_message(
        db,
        conversation_id=conv.id,
        sender_id=current_user.id,
        text=f"{current_user.display_name} created the group \"{group_in.name}\".",
        message_type="system"
    )
    
    # Reload and return
    db.refresh(conv)
    unread = msg_repo.get_unread_message_count(db, conv.id, current_user.id)
    last_msg = msg_repo.get_last_message(db, conv.id)
    last_msg_res = LastMessageResponse.model_validate(last_msg) if last_msg else None
    
    return ConversationResponse(
        id=conv.id,
        name=conv.name,
        is_group=conv.is_group,
        avatar_url=conv.avatar_url,
        description=conv.description,
        disappearing_seconds=conv.disappearing_seconds,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        members=conv.members,
        last_message=last_msg_res,
        unread_count=unread
    )

@router.put("/{conversation_id}", response_model=ConversationResponse)
def update_group_details(
    conversation_id: str,
    group_in: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify membership
    member = conv_repo.get_conversation_member(db, conversation_id, current_user.id)
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this conversation.")
        
    # Check if user is admin to modify details
    if not member.is_admin:
        raise HTTPException(status_code=403, detail="Only group administrators can modify group details.")
        
    updated = conv_repo.update_conversation(
        db,
        conversation_id=conversation_id,
        name=group_in.name,
        description=group_in.description,
        avatar_url=group_in.avatar_url
    )
    
    # Announcement message
    msg_repo.create_message(
        db,
        conversation_id=conversation_id,
        sender_id=current_user.id,
        text=f"{current_user.display_name} updated group settings.",
        message_type="system"
    )
    
    unread = msg_repo.get_unread_message_count(db, updated.id, current_user.id)
    last_msg = msg_repo.get_last_message(db, updated.id)
    last_msg_res = LastMessageResponse.model_validate(last_msg) if last_msg else None
    
    return ConversationResponse(
        id=updated.id,
        name=updated.name,
        is_group=updated.is_group,
        avatar_url=updated.avatar_url,
        description=updated.description,
        disappearing_seconds=updated.disappearing_seconds,
        created_at=updated.created_at,
        updated_at=updated.updated_at,
        members=updated.members,
        last_message=last_msg_res,
        unread_count=unread
    )

@router.post("/{conversation_id}/members/{user_id}", response_model=ConversationResponse)
def add_member_to_group(
    conversation_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify current user is admin in group
    current_member = conv_repo.get_conversation_member(db, conversation_id, current_user.id)
    if not current_member or not current_member.is_admin:
        raise HTTPException(status_code=403, detail="Only group administrators can add new members.")
        
    # Verify target user exists
    target = user_repo.get_user_by_id(db, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found.")
        
    # Check if already a member
    existing = conv_repo.get_conversation_member(db, conversation_id, user_id)
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this group.")
        
    # Add member
    conv_repo.add_conversation_member(db, conversation_id=conversation_id, user_id=user_id, is_admin=False)
    
    # System announcement
    msg_repo.create_message(
        db,
        conversation_id=conversation_id,
        sender_id=current_user.id,
        text=f"{current_user.display_name} added {target.display_name} to the group.",
        message_type="system"
    )
    
    # Return conversation details
    conv = conv_repo.get_conversation_by_id(db, conversation_id)
    unread = msg_repo.get_unread_message_count(db, conv.id, current_user.id)
    last_msg = msg_repo.get_last_message(db, conv.id)
    last_msg_res = LastMessageResponse.model_validate(last_msg) if last_msg else None
    
    return ConversationResponse(
        id=conv.id,
        name=conv.name,
        is_group=conv.is_group,
        avatar_url=conv.avatar_url,
        description=conv.description,
        disappearing_seconds=conv.disappearing_seconds,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        members=conv.members,
        last_message=last_msg_res,
        unread_count=unread
    )

@router.delete("/{conversation_id}/members/{user_id}", response_model=ConversationResponse)
def remove_member_or_leave(
    conversation_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_member = conv_repo.get_conversation_member(db, conversation_id, current_user.id)
    if not current_member:
        raise HTTPException(status_code=403, detail="You are not a member of this conversation.")
        
    target = user_repo.get_user_by_id(db, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found.")
        
    # Leaving group vs Removing member
    if current_user.id == user_id:
        # User is leaving
        left = conv_repo.remove_conversation_member(db, conversation_id, user_id)
        if not left:
            raise HTTPException(status_code=400, detail="Failed to leave group.")
        # Broadcast leaving message
        msg_repo.create_message(
            db,
            conversation_id=conversation_id,
            sender_id=current_user.id,
            text=f"{current_user.display_name} left the group.",
            message_type="system"
        )
    else:
        # Removing someone else, must be admin
        if not current_member.is_admin:
            raise HTTPException(status_code=403, detail="Only group administrators can remove members.")
            
        removed = conv_repo.remove_conversation_member(db, conversation_id, user_id)
        if not removed:
            raise HTTPException(status_code=400, detail="Failed to remove user from group.")
            
        # Broadcast removal message
        msg_repo.create_message(
            db,
            conversation_id=conversation_id,
            sender_id=current_user.id,
            text=f"{current_user.display_name} removed {target.display_name} from the group.",
            message_type="system"
        )
        
    conv = conv_repo.get_conversation_by_id(db, conversation_id)
    # Check if anyone is left in the group. If not, we can archive/delete.
    if len(conv.members) == 0:
        db.delete(conv)
        db.commit()
        raise HTTPException(status_code=200, detail="Group deleted as there are no members left.")
        
    unread = msg_repo.get_unread_message_count(db, conv.id, current_user.id)
    last_msg = msg_repo.get_last_message(db, conv.id)
    last_msg_res = LastMessageResponse.model_validate(last_msg) if last_msg else None
    
    return ConversationResponse(
        id=conv.id,
        name=conv.name,
        is_group=conv.is_group,
        avatar_url=conv.avatar_url,
        description=conv.description,
        disappearing_seconds=conv.disappearing_seconds,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        members=conv.members,
        last_message=last_msg_res,
        unread_count=unread
    )

@router.put("/{conversation_id}/members/{user_id}/promote", response_model=ConversationResponse)
def promote_member_to_admin(
    conversation_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_member = conv_repo.get_conversation_member(db, conversation_id, current_user.id)
    if not current_member or not current_member.is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can promote members.")
        
    target_member = conv_repo.get_conversation_member(db, conversation_id, user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Target is not a member of this conversation.")
        
    target_member.is_admin = True
    db.commit()
    
    target_user = user_repo.get_user_by_id(db, user_id)
    msg_repo.create_message(
        db,
        conversation_id=conversation_id,
        sender_id=current_user.id,
        text=f"{current_user.display_name} promoted {target_user.display_name} to administrator.",
        message_type="system"
    )
    
    conv = conv_repo.get_conversation_by_id(db, conversation_id)
    unread = msg_repo.get_unread_message_count(db, conv.id, current_user.id)
    last_msg = msg_repo.get_last_message(db, conv.id)
    last_msg_res = LastMessageResponse.model_validate(last_msg) if last_msg else None
    
    return ConversationResponse(
        id=conv.id,
        name=conv.name,
        is_group=conv.is_group,
        avatar_url=conv.avatar_url,
        description=conv.description,
        disappearing_seconds=conv.disappearing_seconds,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        members=conv.members,
        last_message=last_msg_res,
        unread_count=unread
    )

@router.put("/{conversation_id}/members/{user_id}/demote", response_model=ConversationResponse)
def demote_admin_to_member(
    conversation_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_member = conv_repo.get_conversation_member(db, conversation_id, current_user.id)
    if not current_member or not current_member.is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can demote other admins.")
        
    target_member = conv_repo.get_conversation_member(db, conversation_id, user_id)
    if not target_member:
        raise HTTPException(status_code=404, detail="Target is not a member of this conversation.")
        
    target_member.is_admin = False
    db.commit()
    
    target_user = user_repo.get_user_by_id(db, user_id)
    msg_repo.create_message(
        db,
        conversation_id=conversation_id,
        sender_id=current_user.id,
        text=f"{current_user.display_name} demoted {target_user.display_name} to member.",
        message_type="system"
    )
    
    conv = conv_repo.get_conversation_by_id(db, conversation_id)
    unread = msg_repo.get_unread_message_count(db, conv.id, current_user.id)
    last_msg = msg_repo.get_last_message(db, conv.id)
    last_msg_res = LastMessageResponse.model_validate(last_msg) if last_msg else None
    
    return ConversationResponse(
        id=conv.id,
        name=conv.name,
        is_group=conv.is_group,
        avatar_url=conv.avatar_url,
        description=conv.description,
        disappearing_seconds=conv.disappearing_seconds,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        members=conv.members,
        last_message=last_msg_res,
        unread_count=unread
    )

@router.delete("/{conversation_id}")
def delete_group(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_member = conv_repo.get_conversation_member(db, conversation_id, current_user.id)
    if not current_member or not current_member.is_admin:
        raise HTTPException(status_code=403, detail="Only administrators can delete the group.")
        
    conv = conv_repo.get_conversation_by_id(db, conversation_id)
    if not conv or not conv.is_group:
        raise HTTPException(status_code=404, detail="Group not found.")
        
    db.delete(conv)
    db.commit()
    
    return {"detail": "Group deleted successfully"}
