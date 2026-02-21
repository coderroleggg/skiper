FROM node:20-bookworm-slim

ARG SKIPER_SERVICE=landing

WORKDIR /app
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  python3-pip \
  python3-venv \
  && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir --break-system-packages \
  beartype==0.21.0 \
  fastapi==0.115.13 \
  openai==2.0.0 \
  pydantic-settings==2.10.1 \
  uvicorn[standard]==0.34.0 \
  youtube-transcript-api==1.2.2

COPY . /app
RUN if [ "$SKIPER_SERVICE" = "landing" ]; then \
  cd /app/landing && npm install && npm run build; \
  fi

COPY docker-entrypoint.sh /usr/local/bin/skiper-entrypoint
RUN chmod +x /usr/local/bin/skiper-entrypoint

ENV SKIPER_SERVICE=landing
ENV PORT=3000
EXPOSE 3000

CMD ["/usr/local/bin/skiper-entrypoint"]
