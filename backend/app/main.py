import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.auth.router import router as auth_router
from app.locations.router import router as locations_router
from app.importer.router import router as importer_router
from app.config import settings
from app.db import AsyncSessionLocal
from app.models.user import User
from app.auth.service import hash_password

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.app_username and settings.app_password:
        async with AsyncSessionLocal() as db:
            existing = await db.execute(select(User).where(User.username == settings.app_username))
            if not existing.scalar_one_or_none():
                db.add(User(username=settings.app_username, password_hash=hash_password(settings.app_password)))
                await db.commit()
                logger.info("Created user '%s' from APP_USERNAME/APP_PASSWORD", settings.app_username)
    yield


app = FastAPI(title="Timeline Viewer", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(locations_router, prefix="/locations", tags=["locations"])
app.include_router(importer_router, prefix="/import", tags=["import"])
