-- AlterTable (SQLite-compatible JSON columns)
ALTER TABLE "DowntimeHaven" ADD COLUMN "identityHints" JSON NOT NULL DEFAULT '{}';
ALTER TABLE "DowntimeHaven" ADD COLUMN "references" JSON NOT NULL DEFAULT '[]';
ALTER TABLE "DowntimeHaven" ADD COLUMN "spaces" JSON NOT NULL DEFAULT '[]';
