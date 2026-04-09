"""
BillingService
--------------
All database query logic for billing snapshots.
Routes call methods here — no raw SQL in endpoint handlers.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import ProviderInsight, ProviderUsage, InsightsResponse, UsageResponse


class BillingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_latest_per_provider(self) -> list[ProviderUsage]:
        """Return the most recent snapshot for each provider."""
        result = await self.db.execute(
            text(
                """
                SELECT DISTINCT ON (provider)
                    id, provider, captured_at, credits_used, credits_remaining, cost_usd
                FROM billing_snapshots
                ORDER BY provider, captured_at DESC
                """
            )
        )
        return [ProviderUsage(**dict(row)) for row in result.mappings().all()]

    async def get_last_24h_history(self) -> list[ProviderUsage]:
        """Return all snapshots from the last 24 hours, oldest first."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        result = await self.db.execute(
            text(
                """
                SELECT id, provider, captured_at, credits_used, credits_remaining, cost_usd
                FROM billing_snapshots
                WHERE captured_at >= :cutoff
                ORDER BY captured_at ASC
                """
            ),
            {"cutoff": cutoff},
        )
        return [ProviderUsage(**dict(row)) for row in result.mappings().all()]

    async def get_usage_response(self) -> UsageResponse:
        snapshots = await self.get_latest_per_provider()
        history = await self.get_last_24h_history()
        last_updated = (
            max(s.captured_at for s in snapshots)
            if snapshots
            else datetime.now(timezone.utc)
        )
        return UsageResponse(
            last_updated=last_updated,
            snapshots=snapshots,
            history=history,
        )

    # ── Insights ──────────────────────────────────────────────────────────────

    PROVIDER_UNITS: dict[str, str] = {
        "deepgram": "USD",
        "groq": "tokens",
        "elevenlabs": "characters",
    }

    async def get_insights(self) -> InsightsResponse:
        """Return pre-computed billing insights for every tracked provider."""
        snapshots = await self.get_latest_per_provider()
        history = await self.get_last_24h_history()

        # Group history by provider for per-provider computations
        history_by_provider: dict[str, list[ProviderUsage]] = {}
        for h in history:
            history_by_provider.setdefault(h.provider, []).append(h)

        insights: list[ProviderInsight] = []
        total_cost: float = 0.0
        has_any_cost = False

        for snap in snapshots:
            provider_history = history_by_provider.get(snap.provider, [])
            unit = self.PROVIDER_UNITS.get(snap.provider, "credits")

            # Depletion rate: (oldest_remaining - newest_remaining) / hours
            depletion_rate = self._compute_depletion_rate(provider_history)

            # Runway: how many hours until credits_remaining hits 0
            runway = None
            if snap.credits_remaining is not None and depletion_rate and depletion_rate > 0:
                runway = round(snap.credits_remaining / depletion_rate, 1)

            # Trend: compare last 3 credits_used values
            trend = self._compute_trend(provider_history)

            # Usage percentage
            usage_pct = None
            if snap.credits_used is not None and snap.credits_remaining is not None:
                total_credits = snap.credits_used + snap.credits_remaining
                if total_credits > 0:
                    usage_pct = round(snap.credits_used / total_credits * 100, 1)

            # Threshold warning
            threshold_warning = (
                snap.credits_remaining is not None
                and snap.credits_remaining < settings.credit_threshold
            )

            if snap.cost_usd is not None:
                total_cost += snap.cost_usd
                has_any_cost = True

            insights.append(
                ProviderInsight(
                    provider=snap.provider,
                    credits_remaining=snap.credits_remaining,
                    credits_used=snap.credits_used,
                    cost_usd=snap.cost_usd,
                    unit=unit,
                    depletion_rate_per_hour=depletion_rate,
                    runway_hours=runway,
                    trend=trend,
                    usage_pct=usage_pct,
                    threshold_warning=threshold_warning,
                    last_captured=snap.captured_at,
                )
            )

        last_updated = (
            max(s.captured_at for s in snapshots)
            if snapshots
            else datetime.now(timezone.utc)
        )

        return InsightsResponse(
            providers=insights,
            total_cost_usd=total_cost if has_any_cost else None,
            last_updated=last_updated,
        )

    @staticmethod
    def _compute_depletion_rate(history: list[ProviderUsage]) -> float | None:
        """Credits consumed per hour, derived from the 24h history window."""
        points = [
            (h.captured_at, h.credits_remaining)
            for h in history
            if h.credits_remaining is not None
        ]
        if len(points) < 2:
            return None
        oldest_time, oldest_val = points[0]
        newest_time, newest_val = points[-1]
        hours = (newest_time - oldest_time).total_seconds() / 3600
        if hours <= 0:
            return None
        delta = oldest_val - newest_val  # positive means credits are depleting
        rate = delta / hours
        return round(rate, 4) if rate > 0 else None

    @staticmethod
    def _compute_trend(history: list[ProviderUsage]) -> str:
        """Determine usage direction from the last 3 snapshots."""
        used_values = [
            h.credits_used for h in history if h.credits_used is not None
        ]
        if len(used_values) < 3:
            return "unknown"
        last3 = used_values[-3:]
        if last3[0] < last3[1] < last3[2]:
            return "increasing"
        if last3[0] > last3[1] > last3[2]:
            return "decreasing"
        return "stable"
