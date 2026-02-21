from __future__ import annotations

from pathlib import Path

from beartype import beartype
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from .config import Settings, get_settings
from .llm import LLMError, LLMScoreResult, build_openai_client, score_transcript, update_user_prompt
from .models import (
    AnalyzeVideoRequest,
    AnalyzeVideoResponse,
    FeedbackRequest,
    FeedbackResponse,
    ScoreBreakdown,
)
from .transcripts import TranscriptFetchError, fetch_transcript_text
from .utils import normalize_video_id


LLM_DOC_PATH = Path(__file__).resolve().parent.parent / "LLM.md"


@beartype
def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Skiper API",
        version="0.1.0",
        description="YouTube transcript scoring and preference update service for Skiper extension.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_parse_csv(settings.cors_allow_origins),
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    client = build_openai_client(settings.openai_base_url, settings.openai_api_key)

    @app.get("/health")
    def _health() -> dict[str, str]:
        return {"status": "ok", "model": settings.openai_model}

    @app.get("/LLM.md", response_class=PlainTextResponse, include_in_schema=False)
    def _llm_markdown() -> str:
        if LLM_DOC_PATH.exists():
            return LLM_DOC_PATH.read_text(encoding="utf-8")
        raise HTTPException(status_code=404, detail="LLM.md not found")

    @app.post("/api/analyze-video", response_model=AnalyzeVideoResponse)
    def _analyze_video(payload: AnalyzeVideoRequest) -> AnalyzeVideoResponse:
        video_id = _normalize_or_422(payload.videoIdOrUrl)
        transcript_text = _fetch_transcript_or_422(video_id, settings)
        llm_scores = _score_or_502(client=client, settings=settings, transcript_text=transcript_text, user_prompt=payload.userPrompt)

        average = round((llm_scores.uniqueness + llm_scores.density + llm_scores.relevance) / 3.0, 2)
        verdict = "hide" if average < 5.0 else "show"

        return AnalyzeVideoResponse(
            videoId=video_id,
            scores=ScoreBreakdown(
                uniqueness=llm_scores.uniqueness,
                density=llm_scores.density,
                relevance=llm_scores.relevance,
            ),
            averageScore=average,
            verdict=verdict,
            summary=llm_scores.summary,
        )

    @app.post("/api/feedback", response_model=FeedbackResponse)
    def _submit_feedback(payload: FeedbackRequest) -> FeedbackResponse:
        video_id = _normalize_or_422(payload.videoIdOrUrl)
        transcript_text = _fetch_transcript_or_422(video_id, settings)

        try:
            updated_prompt = update_user_prompt(
                client=client,
                model=settings.openai_model,
                current_user_prompt=payload.userPrompt,
                transcript_text=transcript_text,
                feedback_text=payload.feedback,
            )
        except LLMError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        return FeedbackResponse(videoId=video_id, updatedUserPrompt=updated_prompt)

    return app


def _parse_csv(raw_value: str) -> list[str]:
    values = [item.strip() for item in raw_value.split(",") if item.strip() != ""]
    if not values:
        return ["*"]
    return values


def _normalize_or_422(video_id_or_url: str) -> str:
    try:
        return normalize_video_id(video_id_or_url)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _fetch_transcript_or_422(video_id: str, settings: Settings) -> str:
    try:
        return fetch_transcript_text(video_id, preferred_languages=_parse_csv(settings.transcript_languages))
    except TranscriptFetchError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _score_or_502(client: object, settings: Settings, transcript_text: str, user_prompt: str) -> LLMScoreResult:
    try:
        return score_transcript(
            client=client,
            model=settings.openai_model,
            transcript_text=transcript_text,
            user_prompt=user_prompt,
        )
    except LLMError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


app = create_app()
