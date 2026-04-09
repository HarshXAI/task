"""
PipelineService
---------------
Orchestrates the full STT → LLM → TTS pipeline.
Reads active providers from the failover router so routing decisions
are always centralised in one place.
"""

import base64
import logging
import time
from dataclasses import dataclass

from app.pipeline import stt, llm, tts
from app.router import get_routing

logger = logging.getLogger(__name__)


@dataclass
class PipelineResult:
    transcript: str
    response: str
    audio_bytes: bytes
    audio_mime: str
    providers_used: dict[str, str]
    latency_ms: dict[str, int]


class PipelineService:
    async def run(
        self,
        *,
        text: str | None = None,
        audio_b64: str | None = None,
        audio_mime: str | None = None,
    ) -> PipelineResult:
        routing = get_routing()
        stt_provider = routing["stt"]["active"]
        tts_provider = routing["tts"]["active"]
        llm_provider = routing.get("llm", {}).get("active", "groq")
        providers_used = {"stt": stt_provider, "llm": llm_provider, "tts": tts_provider}
        latency: dict[str, int] = {}
        total_start = time.monotonic()

        # ── Step 1: STT ───────────────────────────────────────────────────────
        if audio_b64:
            t0 = time.monotonic()
            transcript = await stt.transcribe(audio_b64, stt_provider, audio_mime=audio_mime)
            latency["stt"] = int((time.monotonic() - t0) * 1000)
        else:
            transcript = text or ""
            latency["stt"] = 0

        if not transcript:
            raise ValueError("Empty transcript — no speech detected")

        # ── Step 2: LLM ───────────────────────────────────────────────────────
        t0 = time.monotonic()
        response_text = await llm.chat(transcript)
        latency["llm"] = int((time.monotonic() - t0) * 1000)

        # ── Step 3: TTS (with in-request fallback) ────────────────────────────
        t0 = time.monotonic()
        audio_bytes = await self._synthesize_with_fallback(
            response_text, tts_provider, routing, providers_used
        )
        latency["tts"] = int((time.monotonic() - t0) * 1000)
        latency["total"] = int((time.monotonic() - total_start) * 1000)

        audio_mime = "audio/wav" if audio_bytes[:4] == b"RIFF" else "audio/mpeg"

        return PipelineResult(
            transcript=transcript,
            response=response_text,
            audio_bytes=audio_bytes,
            audio_mime=audio_mime,
            providers_used=providers_used,
            latency_ms=latency,
        )

    @staticmethod
    async def _synthesize_with_fallback(
        text: str,
        provider: str,
        routing: dict,
        providers_used: dict,
    ) -> bytes:
        configured_fallback = routing.get("tts", {}).get("fallback")
        candidates = [provider]
        if configured_fallback and configured_fallback != provider:
            candidates.append(configured_fallback)
        if "openai_tts" not in candidates:
            candidates.append("openai_tts")

        last_exc: Exception | None = None
        for idx, candidate in enumerate(candidates):
            try:
                audio = await tts.synthesize(text, candidate)
                providers_used["tts"] = candidate
                return audio
            except Exception as exc:
                last_exc = exc
                if idx < len(candidates) - 1:
                    logger.warning(
                        "TTS failed (%s): %s — retrying with fallback (%s)",
                        candidate,
                        exc,
                        candidates[idx + 1],
                    )
                else:
                    logger.error("TTS failed after fallbacks %s: %s", candidates, exc)
        assert last_exc is not None
        raise last_exc
