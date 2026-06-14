#!/bin/sh
set -e

cd /app/backend

if echo "$DATABASE_URL" | grep -q '^postgresql:'; then
  attempt=1
  max_attempts=10
  while [ "$attempt" -le "$max_attempts" ]; do
    if su-exec esiana npx prisma migrate deploy; then
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

su-exec esiana node dist/backend/src/index.js &
BACKEND_PID=$!

cleanup() {
  kill "$BACKEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

attempt=1
max_attempts=60
while [ "$attempt" -le "$max_attempts" ]; do
  if node -e "require('http').get('http://127.0.0.1:3001/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"; then
    break
  fi
  if [ "$attempt" -eq "$max_attempts" ]; then
    echo "backend health check failed after ${max_attempts} attempts" >&2
    exit 1
  fi
  sleep 1
  attempt=$((attempt + 1))
done

trap - EXIT INT TERM
exec nginx -g 'daemon off;'
