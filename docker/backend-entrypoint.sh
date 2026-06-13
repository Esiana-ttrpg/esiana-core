#!/bin/sh
set -e
cd /app/backend
if echo "$DATABASE_URL" | grep -q '^postgresql:'; then
  attempt=1
  max_attempts=10
  while [ "$attempt" -le "$max_attempts" ]; do
    if npx prisma migrate deploy; then
      break
    fi
    if [ "$attempt" -eq "$max_attempts" ]; then
      echo "prisma migrate deploy failed after ${max_attempts} attempts" >&2
      exit 1
    fi
    echo "prisma migrate deploy failed (attempt ${attempt}/${max_attempts}), retrying in 3s..." >&2
    sleep 3
    attempt=$((attempt + 1))
  done
fi
exec node dist/backend/src/index.js
