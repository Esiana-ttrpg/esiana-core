-- CreateTable
CREATE TABLE "CampaignScheduledEffectOccurrence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "scheduledEffectId" TEXT NOT NULL,
    "effectKind" TEXT NOT NULL,
    "fireAtEpochMinute" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "suppressionReason" TEXT,
    "worldEventSuggestionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignScheduledEffectOccurrence_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignScheduledEffectOccurrence_scheduledEffectId_fkey" FOREIGN KEY ("scheduledEffectId") REFERENCES "CampaignScheduledEffect" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignScheduledEffectOccurrence_worldEventSuggestionId_fkey" FOREIGN KEY ("worldEventSuggestionId") REFERENCES "CampaignWorldEventSuggestion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignScheduledEffectOccurrence_campaignId_scheduledEffectId_fireAtEpochMinute_key" ON "CampaignScheduledEffectOccurrence"("campaignId", "scheduledEffectId", "fireAtEpochMinute");

-- CreateIndex
CREATE INDEX "CampaignScheduledEffectOccurrence_campaignId_scheduledEffectId_createdAt_idx" ON "CampaignScheduledEffectOccurrence"("campaignId", "scheduledEffectId", "createdAt");
