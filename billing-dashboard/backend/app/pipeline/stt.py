import base64
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

def _infer_audio_mime(audio_bytes: bytes) -> str:
    if audio_bytes.startswith(b"RIFF"):
        return "audio/wav"
    if audio_bytes.startswith(b"\x1aE\xdf\xa3"):
        return "audio/webm"
    if audio_bytes.startswith(b"ID3") or audio_bytes[:2] == b"\xff\xfb":
        return "audio/mpeg"
    if audio_bytes.startswith(b"OggS"):
        return "audio/ogg"
    return "application/octet-stream"


async def transcribe(audio_b64: str, provider: str, *, audio_mime: str | None = None) -> str:
    audio_bytes = base64.b64decode(audio_b64)
    resolved_mime = audio_mime or _infer_audio_mime(audio_bytes)
    if provider == "deepgram":
        try:
            return await _deepgram(audio_bytes, resolved_mime)
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            body = exc.response.text
            if status == 400 and "corrupt or unsupported data" in body.lower():
                logger.warning(
                    "Deepgram rejected audio (%s), falling back to OpenAI STT: %s",
                    resolved_mime,
                    body,
                )
                return await _openai(audio_bytes, resolved_mime)
            raise ValueError(f"Deepgram STT failed ({status}): {body}") from exc
    if provider == "openai":
        return await _openai(audio_bytes, resolved_mime)
    raise ValueError(f"Unknown STT provider: {provider}")


async def _deepgram(audio_bytes: bytes, content_type: str) -> str:
    url = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true"
    headers = {
        "Authorization": f"Token {settings.deepgram_api_key}",
        "Content-Type": content_type,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, content=audio_bytes, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    alts = data.get("results", {}).get("channels", [{}])[0].get("alternatives", [{}])
    return alts[0].get("transcript", "") if alts else ""


async def _openai(audio_bytes: bytes, content_type: str) -> str:
    url = "https://api.openai.com/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
    }
    ext = {
        "audio/webm": "webm",
        "audio/wav": "wav",
        "audio/mpeg": "mp3",
        "audio/ogg": "ogg",
    }.get(content_type, "bin")
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            url,
            headers=headers,
            files={"file": (f"audio.{ext}", audio_bytes, content_type)},
            data={"model": "whisper-1"},
        )
        resp.raise_for_status()
        return resp.json().get("text", "")
