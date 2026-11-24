-- Yearly Wrapped feature flags + explicit publication freeze.
ALTER TABLE "SystemSetting" ADD COLUMN "wrappedEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SystemSetting" ADD COLUMN "publicWrappedPublishingEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "UserWrappedSnapshot" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "UserWrappedSnapshot" ADD COLUMN "publishedPayload" JSONB;
ALTER TABLE "UserWrappedSnapshot" ADD COLUMN "publishedOwnerName" TEXT;

CREATE INDEX "UserWrappedSnapshot_publishedAt_idx" ON "UserWrappedSnapshot"("publishedAt");
