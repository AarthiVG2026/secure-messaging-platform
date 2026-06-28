from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from app.repositories import user as user_repo

router = APIRouter(prefix="/users", tags=["users"])

@router.put("/profile", response_model=UserResponse)
def update_profile(
    profile_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated = user_repo.update_user(
        db,
        user_id=current_user.id,
        display_name=profile_in.display_name,
        bio=profile_in.bio,
        avatar_url=profile_in.avatar_url
    )
    if not updated:
        raise HTTPException(status_code=400, detail="Profile update failed.")
    return updated

@router.get("/search", response_model=List[UserResponse])
def search_users_list(
    q: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if len(q.strip()) < 2:
        return []
    return user_repo.search_users(db, current_user_id=current_user.id, query=q)

@router.get("/all", response_model=List[UserResponse])
def get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return user_repo.get_all_users(db, current_user_id=current_user.id)
