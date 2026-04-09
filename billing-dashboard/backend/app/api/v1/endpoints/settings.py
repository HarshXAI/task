"""
Settings endpoint — runtime configuration that can be changed from the UI.
Currently supports:
  - credit_threshold: failover trigger level
"""

import logging

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["settings"])


class ThresholdUpdate(BaseModel):
    threshold: float


class ThresholdResponse(BaseModel):
    threshold: float


@router.get("/settings/threshold", response_model=ThresholdResponse)
async def get_threshold():
    return ThresholdResponse(threshold=settings.credit_threshold)


@router.put("/settings/threshold", response_model=ThresholdResponse)
async def update_threshold(body: ThresholdUpdate):
    old = settings.credit_threshold
    settings.credit_threshold = body.threshold
    logger.info("credit_threshold updated: %.1f -> %.1f", old, body.threshold)
    return ThresholdResponse(threshold=settings.credit_threshold)
