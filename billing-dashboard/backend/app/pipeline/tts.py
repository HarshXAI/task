import base64

import httpx
from langchain_core.runnables import RunnableLambda

from app.core.config import settings


async def synthesize(text: str, provider: str) -> bytes:
    if provider == "elevenlabs":
        return await _elevenlabs(text)
    if provider == "sarvam":
        return await _sarvam(text)
    if provider in {"openai_tts", "openai"}:
        return await _openai_tts(text)
    raise ValueError(f"Unknown TTS provider: {provider}")


async def synthesize_with_fallbacks(text: str, providers: list[str]) -> tuple[bytes, str]:
    ordered = []
    for provider in providers:
        if provider and provider not in ordered:
            ordered.append(provider)
    if not ordered:
        raise ValueError("No TTS providers configured")

    async def run_provider(provider: str, input_text: str) -> dict:
        audio = await synthesize(input_text, provider)
        return {"audio_bytes": audio, "provider": provider}

    primary = RunnableLambda(lambda input_text: run_provider(ordered[0], input_text))
    fallbacks = [
        RunnableLambda(lambda input_text, p=provider: run_provider(p, input_text))
        for provider in ordered[1:]
    ]

    chain = primary.with_fallbacks(fallbacks) if fallbacks else primary
    result = await chain.ainvoke(text)
    return result["audio_bytes"], result["provider"]


async def _elevenlabs(text: str) -> bytes:
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.elevenlabs_voice_id}"
    model_id = (settings.elevenlabs_tts_model or "").strip() or "eleven_flash_v2_5"
    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    payload = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        return resp.content


async def _sarvam(text: str) -> bytes:
    url = "https://api.sarvam.ai/text-to-speech"
    headers = {
        "api-subscription-key": settings.sarvam_api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": [text],
        "target_language_code": "en-IN",
        "speaker": "aditya",
        "pace": 1.0,
        "speech_sample_rate": 22050,
        "enable_preprocessing": True,
        "model": "bulbul:v3",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        return base64.b64decode(resp.json()["audios"][0])


async def _openai_tts(text: str) -> bytes:
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.openai_tts_model,
        "voice": settings.openai_tts_voice,
        "input": text,
        "format": "mp3",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.openai.com/v1/audio/speech",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()
        return resp.content
