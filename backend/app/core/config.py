import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Signal Clone Secure Messaging"
    API_V1_STR: str = "/api"
    
    # Security
    SECRET_KEY: str = "SUPER_SECRET_SIGNAL_KEY_FOR_LOCAL_DEV_2026_CHANGE_IN_PROD_12345"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 Hours for convenience in dev
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    DATABASE_URL: str = "sqlite:///./signal_clone.db"
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["*"]
    
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
