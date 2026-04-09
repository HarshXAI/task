import httpx

from app.adapters.base import BaseAdapter, UsageSnapshot
from app.core.config import settings


class SarvamAdapter(BaseAdapter):
    async def fetch_usage(self) -> UsageSnapshot:
        url = "https://api.sarvam.ai/v1/credits"
        headers = {"api-subscription-key": settings.sarvam_api_key}

        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()

        credits_used = float(data.get("credits_used", 0))
        credits_limit = float(data.get("credits_limit", 0))

        return UsageSnapshot(
            provider="sarvam",
            credits_used=credits_used,
            credits_remaining=credits_limit - credits_used,
            cost_usd=None,
            raw_response=data,
        )
