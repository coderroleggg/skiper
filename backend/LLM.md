# Skiper Backend API

Base URL example: `https://api.skiper.stefanov.tech`

## Health

### `GET /health`

Returns service health and configured model name.

Response example:

```json
{
  "status": "ok",
  "model": "google/gemini-3-flash-preview"
}
```

## Analyze Video

### `POST /api/analyze-video`

Fetches transcript for a YouTube video and returns quality scores.

Request body:

```json
{
  "videoIdOrUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "userPrompt": "I want deeply technical, practical videos on software architecture."
}
```

Response body:

```json
{
  "videoId": "dQw4w9WgXcQ",
  "scores": {
    "uniqueness": 7.2,
    "density": 6.8,
    "relevance": 8.1
  },
  "averageScore": 7.37,
  "verdict": "show",
  "summary": "First-hand examples with practical implementation details."
}
```

Validation rules:
- each score is clamped to `[0, 10]`
- `verdict` is `hide` when average score is `< 5.0`, otherwise `show`

## Submit Feedback

### `POST /api/feedback`

Uses user feedback and transcript text to update preference prompt.

Request body:

```json
{
  "videoIdOrUrl": "dQw4w9WgXcQ",
  "userPrompt": "I prefer practical software architecture videos.",
  "feedback": "Too generic. I want concrete benchmarks and trade-offs."
}
```

Response body:

```json
{
  "videoId": "dQw4w9WgXcQ",
  "updatedUserPrompt": "I prioritize concrete software architecture content with measured trade-offs, benchmarks, and implementation details over generic commentary."
}
```

## LLM Documentation Route

### `GET /LLM.md`

Returns this Markdown document as plain text.
