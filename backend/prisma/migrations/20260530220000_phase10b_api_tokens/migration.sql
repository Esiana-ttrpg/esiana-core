-- Phase 10B: API token scopes and lastUsedAt

ALTER TABLE "UserToken" ADD COLUMN "lastUsedAt" DATETIME;
ALTER TABLE "UserToken" ADD COLUMN "scopes" JSONB NOT NULL DEFAULT '[]';
