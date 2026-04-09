from fastapi import APIRouter

from app.models import RoutingResponse, ServiceRoute
from app.router import get_routing

router = APIRouter(tags=["routing"])


@router.get("/routing", response_model=RoutingResponse)
async def get_routing_state():
    """Returns which provider is currently active for each service type."""
    state = get_routing()
    return RoutingResponse(
        stt=ServiceRoute(**state["stt"]),
        tts=ServiceRoute(**state["tts"]),
        llm=ServiceRoute(**state["llm"]),
    )
