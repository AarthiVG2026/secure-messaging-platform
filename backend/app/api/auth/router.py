from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserCreate, UserLogin, Token, TokenRefreshRequest, UserResponse
from app.services import auth as auth_service
from app.api.deps import get_current_user
from app.models.user import User
from app.repositories import conversation as conv_repo

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = auth_service.register_new_user(
        db=db,
        phone=user_in.phone,
        username=user_in.username,
        display_name=user_in.display_name,
        password=user_in.password,
        otp=user_in.otp
    )
    access_token, refresh_token = auth_service.generate_user_tokens(db, db_user)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": db_user
    }

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    db_user = auth_service.authenticate_user(
        db=db,
        identifier=login_in.identifier,
        password=login_in.password,
        otp=login_in.otp
    )
    access_token, refresh_token = auth_service.generate_user_tokens(db, db_user)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": db_user
    }

@router.post("/refresh", response_model=Token)
def refresh(refresh_in: TokenRefreshRequest, db: Session = Depends(get_db)):
    access_token, refresh_token = auth_service.refresh_tokens(db, refresh_in.refresh_token)
    # Recover user from the newly validated claims to return the full payload
    payload = auth_service.decode_token(access_token)
    user_id = payload.get("sub")
    from app.repositories import user as user_repo
    db_user = user_repo.get_user_by_id(db, user_id)
    if not db_user:
        raise HTTPException(status_code=401, detail="User not found.")
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": db_user
    }

@router.post("/logout")
def logout(refresh_in: TokenRefreshRequest, db: Session = Depends(get_db)):
    conv_repo.delete_session(db, refresh_in.refresh_token)
    return {"detail": "Successfully logged out and session revoked."}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
