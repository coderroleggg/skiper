from __future__ import annotations

from beartype import beartype
from pydantic import BaseModel, Field


class ScoreBreakdown(BaseModel):
    uniqueness: float = Field(ge=0.0, le=10.0)
    density: float = Field(ge=0.0, le=10.0)
    relevance: float = Field(ge=0.0, le=10.0)


class AnalyzeVideoRequest(BaseModel):
    videoIdOrUrl: str = Field(min_length=3, max_length=512)
    userPrompt: str = Field(min_length=3, max_length=8000)


class AnalyzeVideoResponse(BaseModel):
    videoId: str
    scores: ScoreBreakdown
    averageScore: float = Field(ge=0.0, le=10.0)
    verdict: str = Field(pattern="^(show|hide)$")
    summary: str


class FeedbackRequest(BaseModel):
    videoIdOrUrl: str = Field(min_length=3, max_length=512)
    userPrompt: str = Field(min_length=3, max_length=8000)
    feedback: str = Field(min_length=3, max_length=8000)


class FeedbackResponse(BaseModel):
    videoId: str
    updatedUserPrompt: str = Field(min_length=3, max_length=8000)
