import logging
import socketio
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.services import auth as auth_service
from app.repositories import conversation as conv_repo
from app.repositories import message as msg_repo
from app.repositories import contact as contact_repo
from app.schemas.message import MessageResponse
from app.schemas.conversation import LastMessageResponse

logger = logging.getLogger("socketio")

# Create Async Socket.IO Server
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",  # In production, restrict to settings.BACKEND_CORS_ORIGINS
    ping_timeout=20,
    ping_interval=10
)

# Global mapping for active online users to quickly check presence
# user_id -> set of sids
online_users = {}

@sio.event
async def connect(sid, environ, auth):
    logger.info(f"Socket connection attempt: {sid}")
    
    # 1. Parse token from auth dict
    token = None
    if auth and "token" in auth:
        token = auth["token"]
        if token.startswith("Bearer "):
            token = token[7:]
            
    # Fallback to query params if auth dict is empty
    if not token:
        query_string = environ.get("QUERY_STRING", "")
        params = dict(qc.split("=") for qc in query_string.split("&") if "=" in qc)
        token = params.get("token")
        
    if not token:
        logger.warning("Connection refused: No token provided.")
        raise socketio.exceptions.ConnectionRefusedError("Authentication token is required.")
        
    # 2. Validate token
    db: Session = SessionLocal()
    try:
        user = auth_service.get_current_user_from_token(db, token)
        logger.info(f"Socket connected: {user.display_name} ({user.id})")
        
        # Save session data
        await sio.save_session(sid, {"user_id": user.id, "display_name": user.display_name})
        
        # Join user's individual room
        await sio.enter_room(sid, user.id)
        
        # Track presence
        if user.id not in online_users:
            online_users[user.id] = set()
        online_users[user.id].add(sid)
        
        # Notify user's contacts that they are online
        contacts = contact_repo.get_user_contacts(db, user.id)
        for contact in contacts:
            if not contact.is_blocked:
                # Emit presence update to contact's private room
                await sio.emit(
                    "presence_update", 
                    {"user_id": user.id, "is_online": True}, 
                    room=contact.contact_user_id
                )
                
    except Exception as e:
        logger.error(f"Connection refused: Token invalid. {str(e)}")
        raise socketio.exceptions.ConnectionRefusedError("Invalid authentication token.")
    finally:
        db.close()

@sio.event
async def disconnect(sid):
    session = await sio.get_session(sid)
    user_id = session.get("user_id") if session else None
    
    if user_id:
        logger.info(f"Socket disconnected: {user_id} ({sid})")
        # Update presence tracking
        if user_id in online_users:
            online_users[user_id].discard(sid)
            if not online_users[user_id]:
                # Completely offline (no active tabs/connections left)
                del online_users[user_id]
                
                # Notify contacts
                db = SessionLocal()
                try:
                    contacts = contact_repo.get_user_contacts(db, user_id)
                    for contact in contacts:
                        if not contact.is_blocked:
                            await sio.emit(
                                "presence_update", 
                                {"user_id": user_id, "is_online": False, "last_seen": datetime.now(timezone.utc).isoformat()}, 
                                room=contact.contact_user_id
                            )
                finally:
                    db.close()

@sio.on("join_room")
async def handle_join_room(sid, data):
    session = await sio.get_session(sid)
    user_id = session.get("user_id")
    conv_id = data.get("conversation_id")
    
    if not user_id or not conv_id:
        return
        
    db = SessionLocal()
    try:
        # Verify user is member of conversation
        member = conv_repo.get_conversation_member(db, conv_id, user_id)
        if member:
            await sio.enter_room(sid, conv_id)
            logger.info(f"User {user_id} joined room: {conv_id}")
    finally:
        db.close()

@sio.on("leave_room")
async def handle_leave_room(sid, data):
    conv_id = data.get("conversation_id")
    if conv_id:
        await sio.leave_room(sid, conv_id)
        logger.info(f"Connection left room: {conv_id}")

@sio.on("typing_status")
async def handle_typing_status(sid, data):
    session = await sio.get_session(sid)
    user_id = session.get("user_id")
    conv_id = data.get("conversation_id")
    is_typing = data.get("is_typing", False)
    
    if user_id and conv_id:
        # Broadcast typing status update to the conversation room (excluding the typing client)
        await sio.emit(
            "typing_update",
            {"conversation_id": conv_id, "user_id": user_id, "is_typing": is_typing},
            room=conv_id,
            skip_sid=sid
        )

@sio.on("send_message")
async def handle_send_message(sid, data):
    session = await sio.get_session(sid)
    user_id = session.get("user_id")
    conv_id = data.get("conversation_id")
    text = data.get("text")
    msg_type = data.get("message_type", "text")
    parent_id = data.get("parent_message_id")
    attachment_data = data.get("attachment") # {"file_url", "file_type", "file_size"}
    client_msg_id = data.get("client_msg_id") # For optimistic updates correlation
    
    if not user_id or not conv_id:
        await sio.emit("error", {"message": "Invalid message parameters."}, room=sid)
        return
        
    db = SessionLocal()
    try:
        # 1. Verify membership
        member = conv_repo.get_conversation_member(db, conv_id, user_id)
        if not member:
            await sio.emit("error", {"message": "Access denied."}, room=sid)
            return
            
        # 2. Retrieve conversation settings for disappearing message computations
        conv = conv_repo.get_conversation_by_id(db, conv_id)
        disappearing_at = None
        if conv.disappearing_seconds:
            # We set the disappearance time beginning from insertion
            disappearing_at = datetime.now(timezone.utc) + timedelta(seconds=conv.disappearing_seconds)
            
        # 3. Create message database record
        db_message = msg_repo.create_message(
            db=db,
            conversation_id=conv_id,
            sender_id=user_id,
            text=text,
            message_type=msg_type,
            parent_message_id=parent_id,
            disappearing_at=disappearing_at
        )
        
        # 4. Handle attachment linking if present
        if attachment_data and msg_type == "attachment":
            msg_repo.create_attachment(
                db=db,
                message_id=db_message.id,
                file_url=attachment_data["file_url"],
                file_type=attachment_data["file_type"],
                file_size=attachment_data["file_size"]
            )
            
        # 5. Populate sent status for sender
        msg_repo.set_message_status(db, db_message.id, user_id, "read")
        
        # Re-fetch fully populated message
        populated_msg = msg_repo.get_message_by_id(db, db_message.id)
        
        # 6. Format Response
        msg_res = MessageResponse.model_validate(populated_msg)
        msg_dict = msg_res.model_dump()
        if client_msg_id:
            msg_dict["client_msg_id"] = client_msg_id
            
        # 7. Broadcast message to all active listeners in the conversation room
        await sio.emit("message_new", msg_dict, room=conv_id)
        
        # 8. Notify members not currently focused on this room (increase unread badges)
        # Emit a "conversation_activity" update to each member's private room
        last_msg_res = LastMessageResponse(
            id=populated_msg.id,
            sender_id=populated_msg.sender_id,
            text=populated_msg.text,
            message_type=populated_msg.message_type,
            created_at=populated_msg.created_at
        )
        
        for m in conv.members:
            if m.user_id != user_id:
                # Get member's unread count
                unread = msg_repo.get_unread_message_count(db, conv_id, m.user_id)
                await sio.emit(
                    "conversation_activity",
                    {
                        "conversation_id": conv_id,
                        "last_message": last_msg_res.model_dump(),
                        "unread_count": unread
                    },
                    room=m.user_id
                )
                
    except Exception as e:
        logger.error(f"Error handling message emit: {str(e)}")
        await sio.emit("error", {"message": "Failed to send message."}, room=sid)
    finally:
        db.close()

@sio.on("mark_read")
async def handle_mark_read(sid, data):
    session = await sio.get_session(sid)
    user_id = session.get("user_id")
    conv_id = data.get("conversation_id")
    message_ids = data.get("message_ids", [])
    
    if not user_id or not conv_id or not message_ids:
        return
        
    db = SessionLocal()
    try:
        # Mark read in database
        for mid in message_ids:
            msg_repo.set_message_status(db, mid, user_id, "read")
            
        # Emit read receipt status updates to conversation room
        await sio.emit(
            "receipt_update",
            {
                "conversation_id": conv_id,
                "user_id": user_id,
                "message_ids": message_ids,
                "status": "read"
            },
            room=conv_id
        )
        
        # Send unread badge refresh back to the marking user
        unread = msg_repo.get_unread_message_count(db, conv_id, user_id)
        await sio.emit(
            "unread_count_update",
            {"conversation_id": conv_id, "unread_count": unread},
            room=user_id
        )
        
    except Exception as e:
        logger.error(f"Error in mark_read: {str(e)}")
    finally:
        db.close()

@sio.on("send_reaction")
async def handle_send_reaction(sid, data):
    session = await sio.get_session(sid)
    user_id = session.get("user_id")
    conv_id = data.get("conversation_id")
    message_id = data.get("message_id")
    emoji = data.get("emoji")
    
    if not user_id or not conv_id or not message_id or not emoji:
        return
        
    db = SessionLocal()
    try:
        member = conv_repo.get_conversation_member(db, conv_id, user_id)
        if not member:
            return
            
        reaction = msg_repo.toggle_reaction(db, message_id, user_id, emoji)
        
        # Broadcast reaction update
        await sio.emit(
            "reaction_update",
            {
                "conversation_id": conv_id,
                "message_id": message_id,
                "user_id": user_id,
                "emoji": emoji,
                "status": "added" if reaction else "removed"
            },
            room=conv_id
        )
    except Exception as e:
        logger.error(f"Error in send_reaction: {str(e)}")
    finally:
        db.close()
