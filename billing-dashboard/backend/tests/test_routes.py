import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.db import get_db


def make_row(provider: str, id: int = 1):
    return {
        "id": id,
        "provider": provider,
        "captured_at": datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
        "credits_used": 1000.0,
        "credits_remaining": 5000.0,
        "cost_usd": None,
    }


def mock_mappings(rows):
    mock = MagicMock()
    mock.mappings.return_value.all.return_value = rows
    return mock


@pytest.fixture
def client():
    async def override_get_db():
        db = AsyncMock()
        # First call = latest snapshots, second call = history
        db.execute = AsyncMock(side_effect=[
            mock_mappings([make_row("deepgram", 1), make_row("openai", 2), make_row("elevenlabs", 3)]),
            mock_mappings([make_row("deepgram", 1), make_row("openai", 2)]),
        ])
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_health_endpoint(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_usage_endpoint_returns_snapshots(client):
    resp = client.get("/api/usage")
    assert resp.status_code == 200
    data = resp.json()
    assert "snapshots" in data
    assert "history" in data
    assert "last_updated" in data
    assert len(data["snapshots"]) == 3
    providers = {s["provider"] for s in data["snapshots"]}
    assert providers == {"deepgram", "openai", "elevenlabs"}


def test_usage_snapshot_fields(client):
    resp = client.get("/api/usage")
    snapshot = resp.json()["snapshots"][0]
    assert "provider" in snapshot
    assert "credits_used" in snapshot
    assert "credits_remaining" in snapshot
    assert "captured_at" in snapshot
