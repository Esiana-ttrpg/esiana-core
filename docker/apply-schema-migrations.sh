#!/bin/sh
# Apply pending schema migrations before the API starts. Fail closed.
# PostgreSQL: prisma migrate deploy. SQLite: normalized deploy without reset.
set -e
cd /app/backend

run_prisma_migrate() {
  if command -v su-exec >/dev/null 2>&1 && id esiana >/dev/null 2>&1; then
    su-exec esiana node_modules/.bin/prisma migrate deploy
  else
    node_modules/.bin/prisma migrate deploy
  fi
}

migrate_postgres() {
  attempt=1
  max_attempts=10
  while [ "$attempt" -le "$max_attempts" ]; do
    if run_prisma_migrate; then
      return 0
    fi
    if [ "$attempt" -eq "$max_attempts" ]; then
      echo "prisma migrate deploy failed after ${max_attempts} attempts" >&2
      return 1
    fi
    echo "prisma migrate deploy failed (attempt ${attempt}/${max_attempts}), retrying in 3s..." >&2
    sleep 3
    attempt=$((attempt + 1))
  done
}

run_sqlite_migrate() {
  if command -v su-exec >/dev/null 2>&1 && id esiana >/dev/null 2>&1; then
    su-exec esiana env SQLITE_DB_RESET=0 node prisma/scripts/deploy-sqlite-migrations.mjs --no-generate
  else
    SQLITE_DB_RESET=0 node prisma/scripts/deploy-sqlite-migrations.mjs --no-generate
  fi
}

migrate_sqlite() {
  if [ ! -f prisma/scripts/deploy-sqlite-migrations.mjs ]; then
    echo "SQLite deploy script missing from the image" >&2
    return 1
  fi
  attempt=1
  max_attempts=10
  while [ "$attempt" -le "$max_attempts" ]; do
    if run_sqlite_migrate; then
      return 0
    fi
    if [ "$attempt" -eq "$max_attempts" ]; then
      echo "SQLite migrate deploy failed after ${max_attempts} attempts" >&2
      return 1
    fi
    echo "SQLite migrate deploy failed (attempt ${attempt}/${max_attempts}), retrying in 3s..." >&2
    sleep 3
    attempt=$((attempt + 1))
  done
}

case "${DATABASE_URL}" in
  postgresql:*|postgres:*)
    migrate_postgres
    ;;
  file:*)
    migrate_sqlite
    ;;
  *)
    if [ "${DATABASE_PROVIDER}" = "sqlite" ]; then
      migrate_sqlite
    else
      echo "Unsupported DATABASE_URL for automatic migrations: ${DATABASE_URL:-<empty>}" >&2
      exit 1
    fi
    ;;
esac
