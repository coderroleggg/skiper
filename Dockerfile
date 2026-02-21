FROM node:20-bookworm-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  python3-pip \
  python3-venv \
  && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir \
  beartype==0.21.0 \
  fastapi==0.115.13 \
  openai==2.0.0 \
  pydantic-settings==2.10.1 \
  uvicorn[standard]==0.34.0 \
  youtube-transcript-api==1.2.2

COPY landing/package.json /app/landing/package.json
RUN cd /app/landing && npm install

COPY . /app
RUN cd /app/landing && npm run build

COPY docker-entrypoint.sh /usr/local/bin/skiper-entrypoint
RUN chmod +x /usr/local/bin/skiper-entrypoint

ENV SKIPER_SERVICE=landing
ENV PORT=3000
EXPOSE 3000

CMD ["/usr/local/bin/skiper-entrypoint"]
