from __future__ import annotations

from beartype import beartype
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    AgeRestricted,
    InvalidVideoId,
    IpBlocked,
    NoTranscriptFound,
    RequestBlocked,
    TranscriptsDisabled,
    VideoUnavailable,
)


class TranscriptFetchError(Exception):
    pass


@beartype
def fetch_transcript_text(video_id: str, preferred_languages: list[str]) -> str:
    api = YouTubeTranscriptApi()
    try:
        transcript = api.fetch(video_id, languages=preferred_languages)
    except (TranscriptsDisabled, NoTranscriptFound, VideoUnavailable, AgeRestricted, InvalidVideoId) as exc:
        raise TranscriptFetchError(str(exc)) from exc
    except (RequestBlocked, IpBlocked) as exc:
        raise TranscriptFetchError("YouTube blocked transcript access for this server IP") from exc
    except Exception as exc:
        raise TranscriptFetchError(f"Unexpected transcript fetch error: {exc}") from exc

    parts: list[str] = []
    for snippet in transcript:
        text = getattr(snippet, "text", None)
        if isinstance(text, str):
            normalized = " ".join(text.split())
            if normalized != "":
                parts.append(normalized)

    combined = " ".join(parts).strip()
    if combined == "":
        raise TranscriptFetchError("Transcript is empty")

    return combined
