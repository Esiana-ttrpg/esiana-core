-- NarrativeEvent provenance source for feed filtering and analytics
ALTER TABLE "NarrativeEvent" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'user';
CREATE INDEX "NarrativeEvent_campaignId_source_createdAt_idx" ON "NarrativeEvent"("campaignId", "source", "createdAt");
