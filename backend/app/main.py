import uvicorn
import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.db.session import engine, Base
from app.api.auth.router import router as auth_router
from app.api.contacts.router import router as contacts_router
from app.api.conversations.router import router as conversations_router
from app.api.groups.router import router as groups_router
from app.api.users.router import router as users_router
from app.api.messages.router import router as messages_router
from app.api.websocket.handler import sio  # Import sio AsyncServer instance

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

# Auto create tables for local development (without Alembic if we want rapid setup, but we will support Alembic too!)
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks
    logger.info("Initializing Signal Clone backend server...")
    
    # Auto-seed the database on startup (Perfect for Render Free Tier ephemeral disks)
    try:
        from app.seed.seed_db import seed
        logger.info("Auto-seeding database for demo purposes...")
        seed()
        logger.info("Database auto-seeded successfully!")
    except Exception as e:
        logger.error(f"Failed to auto-seed database: {e}")
        
    # We can run a periodic background task to delete expired disappearing messages
    import asyncio
    from app.db.session import SessionLocal
    from app.repositories import message as msg_repo
    
    async def cleanup_loop():
        while True:
            await asyncio.sleep(10) # Run check every 10 seconds
            db = SessionLocal()
            try:
                deleted_count = msg_repo.delete_expired_disappearing_messages(db)
                if deleted_count > 0:
                    logger.info(f"Cleaned up {deleted_count} expired disappearing messages.")
            except Exception as e:
                logger.error(f"Error in disappearing messages cleanup task: {str(e)}")
            finally:
                db.close()
                
    cleanup_task = asyncio.create_task(cleanup_loop())
    yield
    # Shutdown tasks
    cleanup_task.cancel()
    logger.info("Shutting down Signal Clone backend server...")

# Instantiate FastAPI App
fastapi_app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Setup CORS
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve file uploads static folder
import os
uploads_path = os.path.join("backend", "public", "uploads")
os.makedirs(uploads_path, exist_ok=True)
fastapi_app.mount("/uploads", StaticFiles(directory=uploads_path), name="uploads")

# Include API Route Routers
api_router = FastAPI() # A sub-app or simply including routers
fastapi_app.include_router(auth_router, prefix=settings.API_V1_STR)
fastapi_app.include_router(contacts_router, prefix=settings.API_V1_STR)
fastapi_app.include_router(conversations_router, prefix=settings.API_V1_STR)
fastapi_app.include_router(groups_router, prefix=settings.API_V1_STR)
fastapi_app.include_router(users_router, prefix=settings.API_V1_STR)
fastapi_app.include_router(messages_router, prefix=settings.API_V1_STR)

@fastapi_app.get("/")
def read_root():
    return {"status": "online", "message": "Signal Clone Secure Messaging Platform API"}

# Wrap FastAPI with Socket.IO ASGI app
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
