import asyncio
import logging

from celery import Celery
from celery.schedules import crontab
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.adapters.deepgram import DeepgramAdapter
from app.adapters.elevenlabs import ElevenLabsAdapter
from app.adapters.groq import GroqAdapter
from app.core.config import settings
from app.models import BillingSnapshot
from app.router import clear_provider_failed, mark_provider_failed, update_routing

logger = logging.getLogger(__name__)

celery_app = Celery(
    "billing_worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
)
celery_app.conf.broker_connection_retry_on_startup = True

celery_app.conf.beat_schedule = {
    "poll-all-providers-every-5-min": {
        "task": "app.worker.poll_all_providers",
        "schedule": crontab(minute="*/5"),
    }
}
celery_app.conf.timezone = "UTC"

_task_engine = create_async_engine(settings.database_url, poolclass=NullPool, echo=False)
_task_session_factory = async_sessionmaker(bind=_task_engine, expire_on_commit=False)
_worker_loop: asyncio.AbstractEventLoop | None = None


def _run_async(coro):
    """
    Celery prefork workers are long-lived processes; keep a single event loop per
    process so asyncpg connections are never bounced across different loops.
    """
    global _worker_loop
    if _worker_loop is None or _worker_loop.is_closed():
        _worker_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(_worker_loop)
    return _worker_loop.run_until_complete(coro)


@celery_app.task(bind=True, name="app.worker.poll_all_providers", max_retries=3)
def poll_all_providers(self):
    _run_async(_poll())


async def _poll():
    """
    Poll Deepgram, Groq, and ElevenLabs in sequence.
    Each adapter runs in isolation: a failure in one does not affect the others.
    Each snapshot is committed in its own session to avoid asyncpg concurrency issues.
    """
    adapters = [DeepgramAdapter(), GroqAdapter(), ElevenLabsAdapter()]
    credits_map: dict[str, float | None] = {}

    for adapter in adapters:
        provider_key = adapter.__class__.__name__.replace("Adapter", "").lower()
        snap = None

        try:
            snap = await adapter.fetch_usage()
        except Exception as exc:
            logger.error("[worker] %s fetch failed: %s", adapter.__class__.__name__, exc)
            mark_provider_failed(provider_key, ttl_seconds=300)
            continue

        try:
            async with _task_session_factory() as session:
                session.add(
                    BillingSnapshot(
                        provider=snap.provider,
                        credits_used=snap.credits_used,
                        credits_remaining=snap.credits_remaining,
                        cost_usd=snap.cost_usd,
                        raw_response=snap.raw_response,
                    )
                )
                await session.commit()
        except Exception as exc:
            logger.error("[worker] Failed to persist snapshot for %s: %s", snap.provider, exc)
            mark_provider_failed(provider_key, ttl_seconds=300)
            continue

        credits_map[snap.provider] = snap.credits_remaining
        clear_provider_failed(snap.provider)
        logger.info("[worker] %s polled — credits_remaining=%s credits_used=%s",
                    snap.provider, snap.credits_remaining, snap.credits_used)

    try:
        routing = update_routing(credits_map)
        for svc, state in routing.items():
            if state["status"] != "healthy":
                logger.warning("[routing] %s → %s (%s)", svc, state["active"], state["status"])
    except Exception as exc:
        logger.error("[worker] Routing update failed: %s", exc)
