#!/bin/sh
set -eu

service="${SKIPER_SERVICE:-landing}"

if [ "$service" = "backend" ]; then
  port="${PORT:-8000}"
  cd /app/backend
  exec uvicorn skiper_api.main:app --host 0.0.0.0 --port "$port"
fi

if [ "$service" = "landing" ]; then
  port="${PORT:-3000}"
  cd /app/landing
  exec npm run start -- --hostname 0.0.0.0 --port "$port"
fi

echo "Unsupported SKIPER_SERVICE value: $service"
exit 1
