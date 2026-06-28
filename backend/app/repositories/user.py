from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.user import User
from app.core.security import get_password_hash

def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_phone(db: Session, phone: str) -> Optional[User]:
    return db.query(User).filter(User.phone == phone).first()

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()

def get_user_by_identifier(db: Session, identifier: str) -> Optional[User]:
    # Check phone or username
    return db.query(User).filter(
        or_(User.phone == identifier, User.username == identifier)
    ).first()

def create_user(db: Session, phone: str, username: str, display_name: str, password: str, bio: str = "", avatar_url: Optional[str] = None) -> User:
    hashed_password = get_password_hash(password)
    db_user = User(
        phone=phone,
        username=username,
        display_name=display_name,
        password_hash=hashed_password,
        bio=bio,
        avatar_url=avatar_url
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: str, display_name: Optional[str] = None, bio: Optional[str] = None, avatar_url: Optional[str] = None) -> Optional[User]:
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
    
    if display_name is not None:
        db_user.display_name = display_name
    if bio is not None:
        db_user.bio = bio
    if avatar_url is not None:
        db_user.avatar_url = avatar_url
        
    db.commit()
    db.refresh(db_user)
    return db_user

def search_users(db: Session, current_user_id: str, query: str) -> List[User]:
    # Search users by phone, username, or display name (excluding current user)
    return db.query(User).filter(
        User.id != current_user_id,
        or_(
            User.phone.contains(query),
            User.username.contains(query),
            User.display_name.contains(query)
        )
    ).limit(20).all()

def get_all_users(db: Session, current_user_id: str) -> List[User]:
    return db.query(User).filter(User.id != current_user_id).all()
