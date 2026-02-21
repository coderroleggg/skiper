FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir \
  beartype==0.21.0 \
  fastapi==0.115.13 \
  openai==2.0.0 \
  pydantic-settings==2.10.1 \
  uvicorn[standard]==0.34.0 \
  youtube-transcript-api==1.2.2

COPY skiper_api ./skiper_api
COPY LLM.md ./LLM.md

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn skiper_api.main:app --host 0.0.0.0 --port ${PORT}"]
