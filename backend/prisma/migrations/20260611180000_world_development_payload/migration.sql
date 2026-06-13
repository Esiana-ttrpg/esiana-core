-- World Development — suggestion payload, expiration, prep chains
ALTER TABLE "CampaignWorldEventSuggestion" ADD COLUMN "developmentPayload" JSONB;
ALTER TABLE "CampaignWorldEventSuggestion" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "CampaignWorldEventSuggestion" ADD COLUMN "advanceCycleCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CampaignWorldEventSuggestion" ADD COLUMN "parentSuggestionId" TEXT;

CREATE INDEX "CampaignWorldEventSuggestion_campaignId_expiresAt_idx" ON "CampaignWorldEventSuggestion"("campaignId", "expiresAt");
CREATE INDEX "CampaignWorldEventSuggestion_parentSuggestionId_idx" ON "CampaignWorldEventSuggestion"("parentSuggestionId");
