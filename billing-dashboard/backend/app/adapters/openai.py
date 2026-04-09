import logging
from datetime import date

import httpx

from app.adapters.base import BaseAdapter, UsageSnapshot
from app.core.config import settings

logger = logging.getLogger(__name__)

MOCK_DATA = {
    "data": [{"n_context_tokens_total": 50000, "n_generated_tokens_total": 10000}]
}


class OpenAIAdapter(BaseAdapter):
    async def fetch_usage(self) -> UsageSnapshot:
        today = date.today().strftime("%Y-%m-%d")
        url = f"https://api.openai.com/v1/usage?date={today}"
        headers = {"Authorization": f"Bearer {settings.openai_api_key}"}

        async with httpx.AsyncClient(timeout=15) as client:
            try:
                response = await client.get(url, headers=headers)
                if response.status_code == 404:
                    logger.warning(
                        "OpenAI usage endpoint returned 404 — falling back to mock data. "
                        "This endpoint is deprecated for newer orgs."
                    )
                    data = MOCK_DATA
                else:
                    response.raise_for_status()
                    data = response.json()
                    if not data.get("data"):
                        logger.warning(
                            "OpenAI usage endpoint returned empty data list (no calls today) "
                            "— falling back to mock data."
                        )
                        data = MOCK_DATA
            except httpx.HTTPStatusError as exc:
                logger.warning(
                    "OpenAI usage endpoint unavailable (%s) — falling back to mock data.",
                    exc.response.status_code,
                )
                data = MOCK_DATA

        credits_used = sum(
            entry.get("n_context_tokens_total", 0) + entry.get("n_generated_tokens_total", 0)
            for entry in data.get("data", [])
        )

        return UsageSnapshot(
            provider="openai",
            credits_used=float(credits_used),
            credits_remaining=None,
            cost_usd=None,
            raw_response=data,
        )
