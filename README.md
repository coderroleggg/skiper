# Skiper Monorepo

Services:

- `backend/` — FastAPI transcript + LLM API
- `extension/` — Chrome extension (MV3)
- `landing/` — Next.js multilingual landing page

## Domains

- Landing: `https://skiper.stefanov.tech`
- API: `https://api.skiper.stefanov.tech`

## Quick local run

### Backend

```bash
cd backend
uv sync --dev
uv run uvicorn skiper_api.main:app --reload --host 0.0.0.0 --port 8000
```

### Landing

```bash
cd landing
npm install
npm run dev
```

### Extension

Load `extension/` via `chrome://extensions` -> Developer Mode -> Load unpacked.
