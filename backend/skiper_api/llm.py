from __future__ import annotations

import json
from dataclasses import dataclass

from beartype import beartype
from openai import OpenAI


class LLMError(Exception):
    pass


@dataclass(frozen=True, slots=True)
class LLMScoreResult:
    uniqueness: float
    density: float
    relevance: float
    summary: str


@beartype
def build_openai_client(base_url: str, api_key: str) -> OpenAI:
    return OpenAI(base_url=base_url, api_key=api_key)


@beartype
def score_transcript(
    client: OpenAI,
    model: str,
    transcript_text: str,
    user_prompt: str,
) -> LLMScoreResult:
    completion = client.chat.completions.create(
        model=model,
        temperature=0.1,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You evaluate YouTube transcript quality for one user. "
                    "Return only valid JSON with keys: scores, summary. "
                    "scores must contain uniqueness, density, relevance in range 0..10."
                ),
            },
            {
                "role": "user",
                "content": (
                    "User relevance preference:\n"
                    f"{user_prompt}\n\n"
                    "Transcript:\n"
                    f"{transcript_text}\n\n"
                    "Return JSON exactly with schema:\n"
                    '{"scores":{"uniqueness":0,"density":0,"relevance":0},"summary":"..."}'
                ),
            },
        ],
    )

    raw_content = _extract_content(completion)
    payload = _load_json_object(raw_content)

    scores_obj = payload.get("scores")
    if not isinstance(scores_obj, dict):
        raise LLMError("Model response is missing 'scores' object")

    uniqueness = _normalize_score(scores_obj.get("uniqueness"))
    density = _normalize_score(scores_obj.get("density"))
    relevance = _normalize_score(scores_obj.get("relevance"))

    summary_obj = payload.get("summary")
    summary = summary_obj if isinstance(summary_obj, str) else "No summary provided"

    return LLMScoreResult(
        uniqueness=uniqueness,
        density=density,
        relevance=relevance,
        summary=summary.strip(),
    )


@beartype
def update_user_prompt(
    client: OpenAI,
    model: str,
    current_user_prompt: str,
    transcript_text: str,
    feedback_text: str,
) -> str:
    completion = client.chat.completions.create(
        model=model,
        temperature=0.1,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a preference editor. Improve user relevance preference prompt "
                    "based on explicit feedback and the transcript they reacted to. "
                    "Return only JSON with key updatedUserPrompt."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Current preference prompt:\n"
                    f"{current_user_prompt}\n\n"
                    "Video transcript:\n"
                    f"{transcript_text}\n\n"
                    "User feedback:\n"
                    f"{feedback_text}\n\n"
                    "Produce concise and concrete updated preferences. "
                    "Output JSON schema: {\"updatedUserPrompt\":\"...\"}."
                ),
            },
        ],
    )

    raw_content = _extract_content(completion)
    payload = _load_json_object(raw_content)

    updated = payload.get("updatedUserPrompt")
    if not isinstance(updated, str):
        raise LLMError("Model response is missing 'updatedUserPrompt'")

    cleaned = updated.strip()
    if cleaned == "":
        raise LLMError("Model returned an empty updated user prompt")
    return cleaned


def _extract_content(completion: object) -> str:
    choices = getattr(completion, "choices", None)
    if not isinstance(choices, list) or len(choices) == 0:
        raise LLMError("Model returned no choices")

    first = choices[0]
    message = getattr(first, "message", None)
    content = getattr(message, "content", None)

    if isinstance(content, str):
        stripped = content.strip()
        if stripped != "":
            return stripped

    raise LLMError("Model returned empty content")


def _load_json_object(raw_json: str) -> dict[str, object]:
    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise LLMError(f"Invalid JSON from model: {exc}") from exc

    if not isinstance(parsed, dict):
        raise LLMError("Model JSON payload must be an object")

    return parsed


def _normalize_score(value: object) -> float:
    numeric: float
    if isinstance(value, bool):
        numeric = 0.0
    elif isinstance(value, (int, float)):
        numeric = float(value)
    elif isinstance(value, str):
        try:
            numeric = float(value)
        except ValueError:
            numeric = 0.0
    else:
        numeric = 0.0

    if numeric < 0.0:
        return 0.0
    if numeric > 10.0:
        return 10.0
    return round(numeric, 2)
