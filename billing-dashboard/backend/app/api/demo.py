import base64
import time
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, model_validator

from app.pipeline import stt, llm, tts
from app.router import get_routing

logger = logging.getLogger(__name__)

router = APIRouter()


class PipelineRequest(BaseModel):
    text: Optional[str] = None
    audio_b64: Optional[str] = None

    @model_validator(mode="after")
    def at_least_one(self):
        if not self.text and not self.audio_b64:
            raise ValueError("Provide either 'text' or 'audio_b64'")
        return self


class PipelineResponse(BaseModel):
    transcript: str
    response: str
    audio_b64: str
    audio_mime: str
    providers_used: dict   # { "stt": "deepgram", "llm": "openai", "tts": "elevenlabs" }
    latency_ms: dict       # { "stt": 210, "llm": 450, "tts": 180, "total": 840 }


@router.post("/api/demo/pipeline", response_model=PipelineResponse)
async def run_pipeline(req: PipelineRequest):
    routing = get_routing()
    stt_provider = routing["stt"]["active"]
    tts_provider = routing["tts"]["active"]
    llm_provider = routing.get("llm", {}).get("active", "groq")
    providers_used = {"stt": stt_provider, "llm": llm_provider, "tts": tts_provider}
    latency_ms: dict[str, int] = {}
    total_start = time.monotonic()

    # ── Step 1: STT (only if audio provided) ─────────────────────────────────
    if req.audio_b64:
        t0 = time.monotonic()
        try:
            transcript = await stt.transcribe(req.audio_b64, stt_provider)
        except Exception as exc:
            logger.error("STT failed (%s): %s", stt_provider, exc)
            raise HTTPException(status_code=502, detail=f"STT failed: {exc}")
        latency_ms["stt"] = int((time.monotonic() - t0) * 1000)
    else:
        transcript = req.text
        latency_ms["stt"] = 0

    if not transcript:
        raise HTTPException(status_code=422, detail="Empty transcript — no speech detected")

    # ── Step 2: LLM ───────────────────────────────────────────────────────────
    t0 = time.monotonic()
    try:
        response_text = await llm.chat(transcript)
    except Exception as exc:
        logger.error("LLM failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"LLM failed: {exc}")
    latency_ms["llm"] = int((time.monotonic() - t0) * 1000)

    # ── Step 3: TTS ───────────────────────────────────────────────────────────
    t0 = time.monotonic()
    fallback_tts = routing.get("tts", {}).get("fallback")
    tts_candidates = [tts_provider, fallback_tts, "openai_tts"]
    try:
        audio_bytes, final_tts_provider = await tts.synthesize_with_fallbacks(
            response_text,
            tts_candidates,
        )
        providers_used["tts"] = final_tts_provider
    except Exception as exc:
        logger.error("TTS failed (providers=%s): %s", tts_candidates, exc)
        raise HTTPException(status_code=502, detail=f"TTS failed: {exc}")
    latency_ms["tts"] = int((time.monotonic() - t0) * 1000)

    latency_ms["total"] = int((time.monotonic() - total_start) * 1000)
    audio_mime = "audio/wav" if audio_bytes.startswith(b"RIFF") else "audio/mpeg"

    return PipelineResponse(
        transcript=transcript,
        response=response_text,
        audio_b64=base64.b64encode(audio_bytes).decode(),
        audio_mime=audio_mime,
        providers_used=providers_used,
        latency_ms=latency_ms,
    )
