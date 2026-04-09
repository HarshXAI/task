import base64

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, model_validator

from app.models import PipelineResponse
from app.services.pipeline_service import PipelineService

router = APIRouter(tags=["demo"])


class PipelineRequest(BaseModel):
    text: str | None = None
    audio_b64: str | None = None
    audio_mime: str | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_empty_values(cls, values):
        data = dict(values or {})
        for key in ("text", "audio_b64", "audio_mime"):
            val = data.get(key)
            if isinstance(val, str):
                stripped = val.strip()
                data[key] = stripped or None
        return data

    @model_validator(mode="after")
    def at_least_one(self):
        if not self.text and not self.audio_b64:
            raise ValueError("Provide either 'text' or 'audio_b64'")
        return self


@router.post("/demo/pipeline", response_model=PipelineResponse)
async def run_pipeline(req: PipelineRequest):
    try:
        result = await PipelineService().run(
            text=req.text,
            audio_b64=req.audio_b64,
            audio_mime=req.audio_mime,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return PipelineResponse(
        transcript=result.transcript,
        response=result.response,
        audio_b64=base64.b64encode(result.audio_bytes).decode(),
        audio_mime=result.audio_mime,
        providers_used=result.providers_used,
        latency_ms=result.latency_ms,
    )
