# Skiper Backend

FastAPI service that:
- fetches YouTube transcripts by video ID
- scores content quality with an OpenAI-compatible model on Polza.ai
- updates user relevance preferences from explicit feedback

## Run locally

```bash
cd backend
uv sync --dev
uv run uvicorn skiper_api.main:app --host 0.0.0.0 --port 8000 --reload
```

## Required environment variables

- `OPENAI_BASE_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Optional:
- `TRANSCRIPT_LANGUAGES` (comma-separated; default includes `en,ru,es,pt`)
- `CORS_ALLOW_ORIGINS` (comma-separated, `*` allowed)
