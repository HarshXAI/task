import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx


# ── Deepgram ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_deepgram_adapter_maps_balance(monkeypatch):
    monkeypatch.setenv("DEEPGRAM_API_KEY", "test-key")
    monkeypatch.setenv("DEEPGRAM_PROJECT_ID", "test-project")

    mock_response = MagicMock()
    mock_response.json.return_value = {"balances": [{"amount": "123.45", "balance_id": "b1"}]}
    mock_response.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as MockClient:
        instance = MockClient.return_value.__aenter__.return_value
        instance.get = AsyncMock(return_value=mock_response)

        from app.adapters.deepgram import DeepgramAdapter
        adapter = DeepgramAdapter()
        snapshot = await adapter.fetch_usage()

    assert snapshot.provider == "deepgram"
    assert snapshot.credits_remaining == 123.45
    assert snapshot.credits_used is None


@pytest.mark.asyncio
async def test_deepgram_adapter_empty_balances(monkeypatch):
    monkeypatch.setenv("DEEPGRAM_API_KEY", "test-key")
    monkeypatch.setenv("DEEPGRAM_PROJECT_ID", "test-project")

    mock_response = MagicMock()
    mock_response.json.return_value = {"balances": []}
    mock_response.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as MockClient:
        instance = MockClient.return_value.__aenter__.return_value
        instance.get = AsyncMock(return_value=mock_response)

        from app.adapters.deepgram import DeepgramAdapter
        adapter = DeepgramAdapter()
        snapshot = await adapter.fetch_usage()

    assert snapshot.credits_remaining is None


# ── OpenAI ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_openai_adapter_sums_tokens(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "data": [
            {"n_context_tokens_total": 1000, "n_generated_tokens_total": 500},
            {"n_context_tokens_total": 2000, "n_generated_tokens_total": 300},
        ]
    }
    mock_response.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as MockClient:
        instance = MockClient.return_value.__aenter__.return_value
        instance.get = AsyncMock(return_value=mock_response)

        from app.adapters.openai import OpenAIAdapter
        adapter = OpenAIAdapter()
        snapshot = await adapter.fetch_usage()

    assert snapshot.provider == "openai"
    assert snapshot.credits_used == 3800.0


@pytest.mark.asyncio
async def test_openai_adapter_falls_back_on_404(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    mock_response = MagicMock()
    mock_response.status_code = 404
    mock_response.raise_for_status = MagicMock(
        side_effect=httpx.HTTPStatusError("404", request=MagicMock(), response=mock_response)
    )

    with patch("httpx.AsyncClient") as MockClient:
        instance = MockClient.return_value.__aenter__.return_value
        instance.get = AsyncMock(return_value=mock_response)

        from app.adapters.openai import OpenAIAdapter
        adapter = OpenAIAdapter()
        snapshot = await adapter.fetch_usage()

    # Should return mock data credits_used = 50000 + 10000
    assert snapshot.credits_used == 60000.0


# ── ElevenLabs ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_elevenlabs_adapter_maps_characters(monkeypatch):
    monkeypatch.setenv("ELEVENLABS_API_KEY", "test-key")

    mock_response = MagicMock()
    mock_response.json.return_value = {
        "character_count": 8000,
        "character_limit": 10000,
    }
    mock_response.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient") as MockClient:
        instance = MockClient.return_value.__aenter__.return_value
        instance.get = AsyncMock(return_value=mock_response)

        from app.adapters.elevenlabs import ElevenLabsAdapter
        adapter = ElevenLabsAdapter()
        snapshot = await adapter.fetch_usage()

    assert snapshot.provider == "elevenlabs"
    assert snapshot.credits_used == 8000.0
    assert snapshot.credits_remaining == 2000.0
