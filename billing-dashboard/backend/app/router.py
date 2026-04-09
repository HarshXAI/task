"""
Provider Failover Router
------------------------
Tracks which provider is active for each service type (stt, tts, llm).
State lives in Redis so all workers and API processes share the same view.

Routing table:
  stt:  deepgram   (primary)  → None  (no fallback configured)
  tts:  elevenlabs (primary)  → None
  llm:  groq       (primary)  → None
"""

import json
import logging
from typing import Optional

import redis

from app.core.config import settings

logger = logging.getLogger(__name__)

ROUTING_TABLE: dict[str, tuple[str, Optional[str]]] = {
    "stt": ("deepgram", None),
    "tts": ("elevenlabs", None),
    "llm": ("groq", None),
}

_ROUTING_KEY = "billing:routing"
_FAILED_KEY = "billing:failed:{provider}"


def _client() -> redis.Redis:
    return redis.from_url(settings.redis_url, decode_responses=True)


# ── Write helpers ─────────────────────────────────────────────────────────────

def mark_provider_failed(provider: str, ttl_seconds: int = 300) -> None:
    _client().setex(_FAILED_KEY.format(provider=provider), ttl_seconds, "1")
    logger.warning("Provider %s marked as failed (TTL %ds)", provider, ttl_seconds)


def clear_provider_failed(provider: str) -> None:
    _client().delete(_FAILED_KEY.format(provider=provider))


def _is_failed(r: redis.Redis, provider: str) -> bool:
    return bool(r.exists(_FAILED_KEY.format(provider=provider)))


def _is_degraded(r: redis.Redis, provider: str, credits_remaining: Optional[float]) -> bool:
    if _is_failed(r, provider):
        return True
    return credits_remaining is not None and credits_remaining < settings.credit_threshold


def update_routing(snapshots: dict[str, Optional[float]]) -> dict[str, dict]:
    r = _client()
    routing: dict[str, dict] = {}

    for service, (primary, fallback) in ROUTING_TABLE.items():
        primary_degraded = _is_degraded(r, primary, snapshots.get(primary))

        if not primary_degraded:
            active, status = primary, "healthy"
        elif fallback is not None:
            fallback_degraded = _is_degraded(r, fallback, snapshots.get(fallback))
            if not fallback_degraded:
                active, status = fallback, "fallback"
                logger.warning("[%s] switched %s → %s", service, primary, fallback)
            else:
                active, status = primary, "outage"
                logger.error("[%s] both %s and %s degraded!", service, primary, fallback)
        else:
            active, status = primary, "outage"

        routing[service] = {
            "active": active,
            "primary": primary,
            "fallback": fallback,
            "status": status,
        }

    r.set(_ROUTING_KEY, json.dumps(routing))
    return routing


def get_routing() -> dict[str, dict]:
    raw = _client().get(_ROUTING_KEY)
    if not raw:
        return {
            service: {
                "active": primary,
                "primary": primary,
                "fallback": fallback,
                "status": "healthy",
            }
            for service, (primary, fallback) in ROUTING_TABLE.items()
        }
    return json.loads(raw)
