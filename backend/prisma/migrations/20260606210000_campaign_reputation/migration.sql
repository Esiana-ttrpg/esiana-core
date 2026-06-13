-- Layer 1 — party-to-faction reputation simulation (state, feed events, pending suggestions)
CREATE TABLE "CampaignReputation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "simulationState" JSON NOT NULL DEFAULT '{}',
    "semanticsVersion" TEXT NOT NULL DEFAULT 'campaign-reputation-v1',
    "updatedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignReputation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputation_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CampaignReputation_campaignId_key" ON "CampaignReputation"("campaignId");

CREATE TABLE "CampaignReputationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "reputationId" TEXT NOT NULL,
    "factionPageId" TEXT NOT NULL,
    "eventKind" TEXT NOT NULL,
    "axis" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'flat',
    "fromBand" TEXT,
    "toBand" TEXT,
    "title" TEXT NOT NULL,
    "narrative" TEXT,
    "occurredAtEpochMinute" BIGINT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'other',
    "sourceRef" TEXT NOT NULL,
    "projectId" TEXT,
    "havenWikiPageId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignReputationEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationEvent_reputationId_fkey" FOREIGN KEY ("reputationId") REFERENCES "CampaignReputation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationEvent_factionPageId_fkey" FOREIGN KEY ("factionPageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DowntimeProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationEvent_havenWikiPageId_fkey" FOREIGN KEY ("havenWikiPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "CampaignReputationEvent_campaignId_occurredAtEpochMinute_idx" ON "CampaignReputationEvent"("campaignId", "occurredAtEpochMinute");
CREATE INDEX "CampaignReputationEvent_reputationId_occurredAtEpochMinute_idx" ON "CampaignReputationEvent"("reputationId", "occurredAtEpochMinute");
CREATE INDEX "CampaignReputationEvent_campaignId_factionPageId_idx" ON "CampaignReputationEvent"("campaignId", "factionPageId");

CREATE TABLE "CampaignReputationSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "reputationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "kind" TEXT NOT NULL,
    "factionPageId" TEXT NOT NULL,
    "axis" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'flat',
    "fromBand" TEXT,
    "toBand" TEXT,
    "title" TEXT NOT NULL,
    "narrative" TEXT,
    "occurredAtEpochMinute" BIGINT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'other',
    "sourceRef" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "projectId" TEXT,
    "havenWikiPageId" TEXT,
    "claimId" TEXT,
    "targetOrgPageId" TEXT,
    "proposedTrust" INTEGER,
    "proposedNotoriety" INTEGER,
    "acceptedEventId" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignReputationSuggestion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationSuggestion_reputationId_fkey" FOREIGN KEY ("reputationId") REFERENCES "CampaignReputation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationSuggestion_factionPageId_fkey" FOREIGN KEY ("factionPageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationSuggestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DowntimeProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationSuggestion_havenWikiPageId_fkey" FOREIGN KEY ("havenWikiPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationSuggestion_acceptedEventId_fkey" FOREIGN KEY ("acceptedEventId") REFERENCES "CampaignReputationEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationSuggestion_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CampaignReputationSuggestion_acceptedEventId_key" ON "CampaignReputationSuggestion"("acceptedEventId");
CREATE UNIQUE INDEX "CampaignReputationSuggestion_campaignId_idempotencyKey_key" ON "CampaignReputationSuggestion"("campaignId", "idempotencyKey");
CREATE INDEX "CampaignReputationSuggestion_campaignId_status_idx" ON "CampaignReputationSuggestion"("campaignId", "status");
CREATE INDEX "CampaignReputationSuggestion_reputationId_status_idx" ON "CampaignReputationSuggestion"("reputationId", "status");
