"""
Deepgram billing adapter
------------------------
Two API calls:
  1. GET /v1/projects/{id}/balances        → credits_remaining
  2. GET /v1/projects/{id}/usage?start&end → credits_used (total cost billed today)

Auth:     Authorization: Token {api_key}
Env vars: DEEPGRAM_API_KEY, DEEPGRAM_PROJECT_ID
"""

import logging
from datetime import date, timedelta

import httpx

from app.adapters.base import BaseAdapter, UsageSnapshot
from app.core.config import settings

logger = logging.getLogger(__name__)

BASE = "https://api.deepgram.com/v1/projects"


class DeepgramAdapter(BaseAdapter):
    async def fetch_usage(self) -> UsageSnapshot:
        if not settings.deepgram_api_key:
            logger.error(
                "[deepgram] DEEPGRAM_API_KEY is not set. "
                "Create a key at https://console.deepgram.com → API Keys."
            )
            raise ValueError("DEEPGRAM_API_KEY is missing")

        if not settings.deepgram_project_id:
            logger.error(
                "[deepgram] DEEPGRAM_PROJECT_ID is not set. "
                "Find it at https://console.deepgram.com → Settings → Projects."
            )
            raise ValueError("DEEPGRAM_PROJECT_ID is missing")

        pid = settings.deepgram_project_id
        headers = {"Authorization": f"Token {settings.deepgram_api_key}"}

        credits_remaining = None
        credits_used = None
        cost_usd = None
        raw = {}

        async with httpx.AsyncClient(timeout=15) as client:
            # ── 1. Balances → credits_remaining ──────────────────────────
            try:
                resp = await client.get(f"{BASE}/{pid}/balances", headers=headers)
                resp.raise_for_status()
                bal_data = resp.json()
                raw["balances"] = bal_data

                balances = bal_data.get("balances", [])
                if balances:
                    credits_remaining = float(balances[0]["amount"])
                else:
                    logger.warning("[deepgram] empty balances list — check DEEPGRAM_PROJECT_ID")
            except Exception as exc:
                logger.error("[deepgram] balances request failed: %s", exc)

            # ── 2. Usage → credits_used (cost billed in current period) ──
            try:
                today = date.today()
                # Fetch usage for the last 30 days to get meaningful totals
                start = (today - timedelta(days=30)).isoformat()
                end = (today + timedelta(days=1)).isoformat()
                usage_url = f"{BASE}/{pid}/usage"
                params = {"start": start, "end": end}

                resp = await client.get(usage_url, headers=headers, params=params)
                resp.raise_for_status()
                usage_data = resp.json()
                raw["usage"] = usage_data

                # Deepgram usage response has "results" array with "amount" objects
                results = usage_data.get("results", [])
                total_cost = 0.0
                total_hours = 0.0
                total_requests = 0

                for entry in results:
                    # Each entry may have an "amount" field (cost) or nested structure
                    if isinstance(entry, dict):
                        # Try to extract cost
                        amount = entry.get("amount")
                        if isinstance(amount, dict):
                            total_cost += float(amount.get("amount", 0))
                        elif isinstance(amount, (int, float)):
                            total_cost += float(amount)

                        total_hours += float(entry.get("hours", 0))
                        total_requests += int(entry.get("requests", 0))

                if total_cost > 0:
                    credits_used = total_cost
                    cost_usd = total_cost
                elif total_requests > 0:
                    # If no cost data but we have requests, report request count
                    credits_used = float(total_requests)

                raw["usage_summary"] = {
                    "total_cost": total_cost,
                    "total_hours": total_hours,
                    "total_requests": total_requests,
                    "period": f"{start} to {end}",
                }

                logger.info(
                    "[deepgram] usage: cost=$%.4f hours=%.2f requests=%d (last 30d)",
                    total_cost, total_hours, total_requests,
                )
            except httpx.HTTPStatusError as exc:
                # Usage endpoint may not be available on all plans — not fatal
                logger.warning(
                    "[deepgram] usage endpoint failed (status=%d): %s — skipping",
                    exc.response.status_code,
                    exc.response.text[:200],
                )
            except Exception as exc:
                logger.warning("[deepgram] usage request failed: %s — skipping", exc)

        return UsageSnapshot(
            provider="deepgram",
            credits_used=credits_used,
            credits_remaining=credits_remaining,
            cost_usd=cost_usd,
            raw_response=raw,
        )
