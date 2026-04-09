from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Provider credentials — billing adapters
    deepgram_api_key: str = ""
    deepgram_project_id: str = ""
    groq_api_key: str = ""
    groq_usage_probe_model: str = "llama-3.1-8b-instant"
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"
    elevenlabs_tts_model: str = "eleven_flash_v2_5"

    # OpenAI — used for voice pipeline (Whisper STT + TTS) only, not billing
    openai_api_key: str = ""
    openai_tts_model: str = "gpt-4o-mini-tts"
    openai_tts_voice: str = "alloy"

    sarvam_api_key: str = ""

    # Infrastructure
    database_url: str = "postgresql+asyncpg://user:pass@localhost:5432/billing"
    redis_url: str = "redis://localhost:6379/0"

    # Failover
    credit_threshold: float = 500.0

    # App
    cors_origins: list[str] = ["http://localhost:3000"]
    app_title: str = "AI Billing Dashboard"
    app_version: str = "1.0.0"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
