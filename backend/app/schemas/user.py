from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class UserBase(BaseModel):
    phone: str
    username: str
    display_name: str

class UserCreate(UserBase):
    password: str
    otp: Optional[str] = None  # To allow optional mock OTP check ("123456")

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class UserLogin(BaseModel):
    identifier: str  # Can be username or phone
    password: str
    otp: Optional[str] = None

class UserResponse(UserBase):
    id: str
    bio: str
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    type: Optional[str] = None
    exp: Optional[float] = None
