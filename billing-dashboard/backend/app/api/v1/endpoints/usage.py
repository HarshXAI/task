from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models import InsightsResponse, UsageResponse
from app.services.billing_service import BillingService

router = APIRouter(tags=["usage"])


@router.get("/usage", response_model=UsageResponse)
async def get_usage(db: AsyncSession = Depends(get_db)):
    return await BillingService(db).get_usage_response()


@router.get("/usage/insights", response_model=InsightsResponse)
async def get_usage_insights(db: AsyncSession = Depends(get_db)):
    """Pre-computed billing insights: runway, trends, depletion rates."""
    return await BillingService(db).get_insights()
