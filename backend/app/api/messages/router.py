import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.message import MessageResponse, MessageEdit, ReactionCreate, ReactionResponse
from app.repositories import message as msg_repo
from app.repositories import conversation as conv_repo

router = APIRouter(prefix="/messages", tags=["messages"])

# Create uploads directory
UPLOAD_DIR = os.path.join("d:\\scaler ai", "backend", "public", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Get file extension
    ext = os.path.splitext(file.filename)[1]
    # Unique filename
    unique_filename = f"{uuid.uuid4()}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
        
    # Get file size
    file_size = os.path.getsize(dest_path)
    
    # Return URL path
    file_url = f"/uploads/{unique_filename}"
    
    return {
        "file_url": file_url,
        "file_type": file.content_type or "application/octet-stream",
        "file_size": file_size,
        "filename": file.filename
    }

@router.put("/{message_id}", response_model=MessageResponse)
def edit_message_text(
    message_id: str,
    edit_in: MessageEdit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if message exists
    msg = msg_repo.get_message_by_id(db, message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
        
    # Check if current user is the sender
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own messages.")
        
    # Edit message
    updated = msg_repo.edit_message(db, message_id, edit_in.text)
    return updated

@router.delete("/{message_id}")
def delete_message_record(
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msg = msg_repo.get_message_by_id(db, message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
        
    # Check sender
    if msg.sender_id != current_user.id:
        # Check if user is group admin (admins can delete any message in group!)
        member = conv_repo.get_conversation_member(db, msg.conversation_id, current_user.id)
        if not member or not member.is_admin:
            raise HTTPException(status_code=403, detail="You do not have permission to delete this message.")
            
    # Soft delete
    deleted = msg_repo.delete_message(db, message_id)
    if not deleted:
        raise HTTPException(status_code=400, detail="Failed to delete message.")
    return {"detail": "Message deleted successfully."}

@router.post("/{message_id}/react")
def react_to_message(
    message_id: str,
    reaction_in: ReactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    msg = msg_repo.get_message_by_id(db, message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
        
    # Check if user has access to conversation
    member = conv_repo.get_conversation_member(db, msg.conversation_id, current_user.id)
    if not member:
        raise HTTPException(status_code=403, detail="You do not have access to this conversation.")
        
    reaction = msg_repo.toggle_reaction(db, message_id, current_user.id, reaction_in.emoji)
    
    if reaction:
        return {"status": "added", "emoji": reaction.emoji}
    else:
        return {"status": "removed"}
