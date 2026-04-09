import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import BillingSnapshot, ProviderUsage, RoutingResponse, ServiceRoute, UsageResponse
from app.router import get_routing

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/api/health")
async def health():
    return {"status": "ok"}


@router.get("/api/usage", response_model=UsageResponse)
async def get_usage(db: AsyncSession = Depends(get_db)):
    # Latest snapshot per provider
    latest_query = text(
        """
        SELECT DISTINCT ON (provider)
            id, provider, captured_at, credits_used, credits_remaining, cost_usd
        FROM billing_snapshots
        ORDER BY provider, captured_at DESC
        """
    )
    latest_result = await db.execute(latest_query)
    latest_rows = latest_result.mappings().all()

    # Last 24h history for time-series chart
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    history_query = text(
        """
        SELECT id, provider, captured_at, credits_used, credits_remaining, cost_usd
        FROM billing_snapshots
        WHERE captured_at >= :cutoff
        ORDER BY captured_at ASC
        """
    )
    history_result = await db.execute(history_query, {"cutoff": cutoff})
    history_rows = history_result.mappings().all()

    snapshots = [ProviderUsage(**dict(row)) for row in latest_rows]
    history = [ProviderUsage(**dict(row)) for row in history_rows]

    last_updated = (
        max(s.captured_at for s in snapshots)
        if snapshots
        else datetime.now(timezone.utc)
    )

    return UsageResponse(last_updated=last_updated, snapshots=snapshots, history=history)


@router.get("/api/routing", response_model=RoutingResponse)
async def get_routing_state():
    """Returns which provider is currently active for each service type."""
    state = get_routing()
    return RoutingResponse(
        stt=ServiceRoute(**state["stt"]),
        tts=ServiceRoute(**state["tts"]),
        llm=ServiceRoute(**state["llm"]),
    )


@router.websocket("/ws/live")
async def websocket_live(websocket: WebSocket, db: AsyncSession = Depends(get_db)):
    await websocket.accept()
    try:
        while True:
            latest_query = text(
                """
                SELECT DISTINCT ON (provider)
                    id, provider, captured_at, credits_used, credits_remaining, cost_usd
                FROM billing_snapshots
                ORDER BY provider, captured_at DESC
                """
            )
            result = await db.execute(latest_query)
            rows = result.mappings().all()
            snapshots = [ProviderUsage(**dict(row)) for row in rows]

            payload = {
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "snapshots": [s.model_dump(mode="json") for s in snapshots],
                "routing": get_routing(),
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(30)
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as exc:
        logger.error("WebSocket error: %s", exc)
        await websocket.close()
