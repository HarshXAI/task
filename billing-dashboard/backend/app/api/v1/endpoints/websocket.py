import asyncio
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.router import get_routing
from app.services.billing_service import BillingService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/live")
async def websocket_live(websocket: WebSocket, db: AsyncSession = Depends(get_db)):
    await websocket.accept()
    try:
        while True:
            svc = BillingService(db)
            snapshots = await svc.get_latest_per_provider()
            insights_resp = await svc.get_insights()
            payload = {
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "snapshots": [s.model_dump(mode="json") for s in snapshots],
                "routing": get_routing(),
                "insights": insights_resp.model_dump(mode="json"),
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(30)
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as exc:
        logger.error("WebSocket error: %s", exc)
        await websocket.close()
