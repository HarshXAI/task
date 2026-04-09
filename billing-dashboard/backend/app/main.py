import logging

from fastapi import FastAPI

from app.api.v1.router import api_router, ws_router
from app.core.config import settings
from app.core.middleware import setup_middleware
from app.db import engine
from app.models import Base

logging.basicConfig(level=logging.INFO)

app = FastAPI(title=settings.app_title, version=settings.app_version)

setup_middleware(app)
app.include_router(api_router)
app.include_router(ws_router)


@app.on_event("startup")
async def startup():
    # Creates tables if they don't exist.
    # Production uses Alembic migrations instead.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
