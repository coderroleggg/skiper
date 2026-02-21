from __future__ import annotations

from urllib.parse import parse_qs, urlparse

from beartype import beartype


@beartype
def normalize_video_id(video_id_or_url: str) -> str:
    value = video_id_or_url.strip()
    if value == "":
        raise ValueError("Video ID or URL is empty")

    if "youtube.com" not in value and "youtu.be" not in value:
        if _looks_like_video_id(value):
            return value
        raise ValueError("Unsupported YouTube ID format")

    parsed = urlparse(value)
    hostname = parsed.netloc.lower()

    if "youtu.be" in hostname:
        candidate = parsed.path.strip("/")
        if _looks_like_video_id(candidate):
            return candidate
        raise ValueError("Could not parse YouTube short URL")

    if "youtube.com" in hostname:
        if parsed.path == "/watch":
            query = parse_qs(parsed.query)
            candidates = query.get("v", [])
            if candidates:
                candidate = candidates[0]
                if _looks_like_video_id(candidate):
                    return candidate
        if parsed.path.startswith("/shorts/"):
            candidate = parsed.path.split("/shorts/", maxsplit=1)[1].split("/", maxsplit=1)[0]
            if _looks_like_video_id(candidate):
                return candidate

    raise ValueError("Could not parse YouTube video ID")


def _looks_like_video_id(value: str) -> bool:
    if len(value) < 6:
        return False
    return all(ch.isalnum() or ch in ("-", "_") for ch in value)
