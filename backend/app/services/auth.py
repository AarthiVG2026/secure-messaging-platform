from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.repositories import user as user_repo
from app.repositories import conversation as conv_repo
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.core.config import settings

def register_new_user(db: Session, phone: str, username: str, display_name: str, password: str, otp: Optional[str] = None) -> User:
    # Verify mock OTP if present or check if it matches "123456"
    if otp and otp != "123456":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Use 123456 for testing."
        )
        
    # Check if phone already registered
    existing_phone = user_repo.get_user_by_phone(db, phone)
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered."
        )
        
    # Check if username already taken
    existing_username = user_repo.get_user_by_username(db, username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken."
        )
        
    return user_repo.create_user(
        db=db,
        phone=phone,
        username=username,
        display_name=display_name,
        password=password
    )

def authenticate_user(db: Session, identifier: str, password: str, otp: Optional[str] = None) -> User:
    # If OTP is passed, check it
    if otp and otp != "123456":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Use 123456 for testing."
        )
        
    db_user = user_repo.get_user_by_identifier(db, identifier)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username, phone, or password."
        )
        
    if not verify_password(password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username, phone, or password."
        )
        
    return db_user

def generate_user_tokens(db: Session, user: User) -> Tuple[str, str]:
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    
    # Store session in DB
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    conv_repo.create_session(db, user_id=user.id, refresh_token=refresh_token, expires_at=expires_at)
    
    return access_token, refresh_token

def refresh_tokens(db: Session, refresh_token: str) -> Tuple[str, str]:
    # Check payload
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token payload."
        )
        
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token subject."
        )
        
    # Check session in database
    db_session = conv_repo.get_session_by_token(db, refresh_token)
    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token session not found or revoked."
        )
        
    # Check expiry
    if db_session.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        conv_repo.delete_session(db, refresh_token)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired."
        )
        
    # Get user
    user = user_repo.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found."
        )
        
    # Revoke old refresh token
    conv_repo.delete_session(db, refresh_token)
    
    # Issue new ones
    return generate_user_tokens(db, user)

def get_current_user_from_token(db: Session, token: str) -> User:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials token."
        )
        
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user subject."
        )
        
    user = user_repo.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token not found."
        )
        
    return user
