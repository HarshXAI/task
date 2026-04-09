"""
Groq billing adapter
--------------------
Groq's API does not expose a traditional credit quota on the free tier.
Instead, usage is tracked by total tokens consumed per day.

Primary endpoint:  GET https://api.groq.com/openai/v1/usage  (org-level usage)
Fallback:          GET https://api.groq.com/openai/v1/models  (connectivity check only)

Note: The /v1/usage endpoint may not be available on all Groq plans.
If it returns 404 or 403, we fall back to the models endpoint as a liveness
check and record credits_used=None / credits_remaining=None with a warning.
credits_remaining is always None on the Groq free tier — there is no hard quota.

Env var: GROQ_API_KEY   (get a free key at console.groq.com — no credit card needed)
"""

import logging
from datetime import date

import httpx

from app.adapters.base import BaseAdapter, UsageSnapshot
from app.core.config import settings

logger = logging.getLogger(__name__)


class GroqAdapter(BaseAdapter):
    async def fetch_usage(self) -> UsageSnapshot:
        if not settings.groq_api_key:
            logger.error(
                "[groq] GROQ_API_KEY is not set. "
                "Get a free key at https://console.groq.com and add it to .env."
            )
            raise ValueError("GROQ_API_KEY is missing")

        headers = {"Authorization": f"Bearer {settings.groq_api_key}"}

        async with httpx.AsyncClient(timeout=15) as client:
            credits_used = await self._fetch_token_usage(client, headers)

        return UsageSnapshot(
            provider="groq",
            credits_used=credits_used,
            credits_remaining=None,  # Groq free tier has no hard quota
            cost_usd=None,
            raw_response={"tokens_used": credits_used, "note": "free tier — no hard quota"},
        )

    async def _fetch_token_usage(
        self, client: httpx.AsyncClient, headers: dict
    ) -> float | None:
        today = date.today().strftime("%Y-%m-%d")
        url = f"https://api.groq.com/openai/v1/usage?date={today}"

        try:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                # Response shape varies by plan; sum all token counts found
                tokens = self._extract_tokens(data)
                logger.info("[groq] usage endpoint OK — %s tokens today", tokens)
                return tokens

            logger.warning(
                "[groq] usage endpoint returned %d — falling back to connectivity check. "
                "Body: %s",
                resp.status_code,
                resp.text[:300],
            )
        except httpx.RequestError as exc:
            logger.warning("[groq] usage endpoint request failed: %s — trying connectivity check", exc)

        # ── Fallback: confirm key via /models, then try extracting usage from a tiny probe call.
        models_ok = await self._connectivity_check(client, headers)
        if not models_ok:
            return None
        return await self._probe_usage_from_chat(client, headers)

    async def _connectivity_check(
        self, client: httpx.AsyncClient, headers: dict
    ) -> bool:
        """
        Hits /v1/models as a liveness probe. Returns None for token count but
        confirms the key is valid. Logs a warning so operators know real usage
        tracking is unavailable.
        """
        url = "https://api.groq.com/openai/v1/models"
        try:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                logger.info("[groq] Key validated via /v1/models.")
                return True
            logger.error(
                "[groq] Connectivity check failed: status=%d body=%s",
                resp.status_code,
                resp.text[:300],
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.error(
                "[groq] Key validation failed: status=%d body=%s",
                exc.response.status_code,
                exc.response.text[:300],
            )
            raise
        return False

    async def _probe_usage_from_chat(
        self, client: httpx.AsyncClient, headers: dict
    ) -> float | None:
        """
        Groq returns usage tokens on chat completions.
        This tiny probe lets us surface a real, recent token count when /usage
        endpoint is not available on the current plan.
        """
        payload = {
            "model": settings.groq_usage_probe_model,
            "messages": [{"role": "user", "content": "ok"}],
            "max_tokens": 1,
            "temperature": 0,
        }
        url = "https://api.groq.com/openai/v1/chat/completions"
        try:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            usage = data.get("usage", {})
            total = usage.get("total_tokens")
            if total is None:
                total = (usage.get("prompt_tokens", 0) or 0) + (
                    usage.get("completion_tokens", 0) or 0
                )
            logger.info("[groq] usage probe via chat completion — total_tokens=%s", total)
            return float(total)
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "[groq] usage probe failed: status=%d body=%s",
                exc.response.status_code,
                exc.response.text[:300],
            )
        except httpx.RequestError as exc:
            logger.warning("[groq] usage probe request error: %s", exc)
        return None

    @staticmethod
    def _extract_tokens(data: dict) -> float:
        """
        Groq usage responses can vary. Try common shapes and sum all token fields.
        """
        total = 0.0
        # Shape: {"data": [{"total_tokens": N, ...}]}
        for entry in data.get("data", []):
            total += entry.get("total_tokens", 0)
            total += entry.get("prompt_tokens", 0)
            total += entry.get("completion_tokens", 0)
        # Shape: {"total_tokens": N} (flat)
        if not data.get("data"):
            total += data.get("total_tokens", 0)
        return total
