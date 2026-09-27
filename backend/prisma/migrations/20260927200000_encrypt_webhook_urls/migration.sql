-- Application startup completes this data migration using the configured
-- AES-GCM secret-box key.
ALTER TABLE "WebhookEndpoint" RENAME COLUMN "url" TO "urlEnc";
