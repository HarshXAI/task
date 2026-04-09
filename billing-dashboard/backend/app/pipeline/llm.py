import httpx

from app.core.config import settings

SYSTEM_PROMPT = (
    "You are a helpful voice assistant for Adam's AI, an Indian voice AI company "
    "that builds STT→LLM→TTS pipelines for businesses. "
    "Keep responses concise and conversational — under 3 sentences."
)


async def chat(text: str) -> str:
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
        "max_tokens": 150,
        "temperature": 0.7,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
