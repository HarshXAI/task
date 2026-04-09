"""
API v1 router — assembles all endpoint modules under /api prefix.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    demo,
    health,
    routing_status,
    settings,
    usage,
    websocket,
)

api_router = APIRouter(prefix="/api")
ws_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(usage.router)
api_router.include_router(routing_status.router)
api_router.include_router(demo.router)
api_router.include_router(settings.router)
ws_router.include_router(websocket.router)
