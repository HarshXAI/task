from datetime import datetime
from typing import List, Optional
from sqlalchemy import Column, Integer, String, Numeric, DateTime, JSON, Index, text
from sqlalchemy.orm import DeclarativeBase
from pydantic import BaseModel


class Base(DeclarativeBase):
    pass


class BillingSnapshot(Base):
    __tablename__ = "billing_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    provider = Column(String(50), nullable=False)
    captured_at = Column(DateTime(timezone=True), server_default=text("now()"))
    credits_used = Column(Numeric(12, 4), nullable=True)
    credits_remaining = Column(Numeric(12, 4), nullable=True)
    cost_usd = Column(Numeric(10, 4), nullable=True)
    raw_response = Column(JSON, nullable=True)

    __table_args__ = (
        Index("ix_billing_snapshots_provider", "provider"),
        Index("ix_billing_snapshots_captured_at", "captured_at"),
    )


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ProviderUsage(BaseModel):
    id: int
    provider: str
    captured_at: datetime
    credits_used: Optional[float]
    credits_remaining: Optional[float]
    cost_usd: Optional[float]

    model_config = {"from_attributes": True}


class UsageResponse(BaseModel):
    last_updated: datetime
    snapshots: List[ProviderUsage]
    history: List[ProviderUsage]


class ServiceRoute(BaseModel):
    active: str
    primary: str
    fallback: Optional[str]
    status: str  # "healthy" | "fallback" | "outage"


class RoutingResponse(BaseModel):
    stt: ServiceRoute
    tts: ServiceRoute
    llm: ServiceRoute


class PipelineResponse(BaseModel):
    transcript: str
    response: str
    audio_b64: str
    audio_mime: str
    providers_used: dict
    latency_ms: dict


# ── Insights schemas ─────────────────────────────────────────────────────────

class ProviderInsight(BaseModel):
    provider: str
    credits_remaining: Optional[float]
    credits_used: Optional[float]
    cost_usd: Optional[float]
    unit: str                              # "USD" | "tokens" | "characters"
    depletion_rate_per_hour: Optional[float]
    runway_hours: Optional[float]
    trend: str                             # "increasing" | "decreasing" | "stable" | "unknown"
    usage_pct: Optional[float]             # used / (used + remaining) * 100
    threshold_warning: bool
    last_captured: datetime


class InsightsResponse(BaseModel):
    providers: List[ProviderInsight]
    total_cost_usd: Optional[float]
    last_updated: datetime
