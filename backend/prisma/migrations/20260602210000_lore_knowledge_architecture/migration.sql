-- Phase 22: interpretive lore overlays (historical aliases, interpretations, claims)

CREATE TABLE "EntityHistoricalAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stableKey" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "context" TEXT,
    "usageType" TEXT NOT NULL DEFAULT 'OFFICIAL',
    "eraStart" JSONB,
    "eraEnd" JSONB,
    "regions" JSONB NOT NULL DEFAULT '[]',
    "visibility" TEXT NOT NULL DEFAULT 'GM_ONLY',
    "isPrimaryInEra" BOOLEAN NOT NULL DEFAULT false,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "playerDiscoverable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EntityHistoricalAlias_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EntityHistoricalAlias_stableKey_key" ON "EntityHistoricalAlias"("stableKey");
CREATE INDEX "EntityHistoricalAlias_pageId_idx" ON "EntityHistoricalAlias"("pageId");
CREATE INDEX "EntityHistoricalAlias_campaignId_pageId_idx" ON "EntityHistoricalAlias"("campaignId", "pageId");

CREATE TABLE "LoreInterpretationGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "topic" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoreInterpretationGroup_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "LoreInterpretationGroup_pageId_idx" ON "LoreInterpretationGroup"("pageId");
CREATE INDEX "LoreInterpretationGroup_campaignId_pageId_idx" ON "LoreInterpretationGroup"("campaignId", "pageId");

CREATE TABLE "LoreInterpretationAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stableKey" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "interpretationGroupId" TEXT,
    "title" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "accountKind" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "beliefRegion" TEXT,
    "sourceOrigin" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "visibility" TEXT NOT NULL DEFAULT 'GM_ONLY',
    "narrativeWeight" TEXT,
    "gmResolution" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoreInterpretationAccount_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LoreInterpretationAccount_interpretationGroupId_fkey" FOREIGN KEY ("interpretationGroupId") REFERENCES "LoreInterpretationGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LoreInterpretationAccount_stableKey_key" ON "LoreInterpretationAccount"("stableKey");
CREATE INDEX "LoreInterpretationAccount_pageId_idx" ON "LoreInterpretationAccount"("pageId");
CREATE INDEX "LoreInterpretationAccount_interpretationGroupId_idx" ON "LoreInterpretationAccount"("interpretationGroupId");
CREATE INDEX "LoreInterpretationAccount_campaignId_pageId_idx" ON "LoreInterpretationAccount"("campaignId", "pageId");

CREATE TABLE "LoreClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stableKey" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "interpretationGroupId" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "visibility" TEXT NOT NULL DEFAULT 'GM_ONLY',
    "narrativeWeight" TEXT,
    "gmResolution" TEXT,
    "knowledgeState" TEXT,
    "discoveredViaSessionId" TEXT,
    "discoveredAt" DATETIME,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoreClaim_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LoreClaim_interpretationGroupId_fkey" FOREIGN KEY ("interpretationGroupId") REFERENCES "LoreInterpretationGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "LoreClaim_stableKey_key" ON "LoreClaim"("stableKey");
CREATE INDEX "LoreClaim_pageId_idx" ON "LoreClaim"("pageId");
CREATE INDEX "LoreClaim_interpretationGroupId_idx" ON "LoreClaim"("interpretationGroupId");
CREATE INDEX "LoreClaim_campaignId_pageId_idx" ON "LoreClaim"("campaignId", "pageId");

CREATE TABLE "LoreClaimSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SUPPORTS',
    "sourceType" TEXT NOT NULL DEFAULT 'OTHER',
    "sourceEntityType" TEXT,
    "sourceEntityId" TEXT,
    "label" TEXT,
    "note" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'GM_ONLY',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoreClaimSource_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "LoreClaim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "LoreClaimSource_claimId_idx" ON "LoreClaimSource"("claimId");
