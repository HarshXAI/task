import httpx

from app.adapters.base import BaseAdapter, UsageSnapshot
from app.core.config import settings


class ElevenLabsAdapter(BaseAdapter):
    async def fetch_usage(self) -> UsageSnapshot:
        url = "https://api.elevenlabs.io/v1/user/subscription"
        headers = {"xi-api-key": settings.elevenlabs_api_key}

        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()

        character_count = data.get("character_count", 0)
        character_limit = data.get("character_limit", 0)

        return UsageSnapshot(
            provider="elevenlabs",
            credits_used=float(character_count),
            credits_remaining=float(character_limit - character_count),
            cost_usd=None,
            raw_response=data,
        )
