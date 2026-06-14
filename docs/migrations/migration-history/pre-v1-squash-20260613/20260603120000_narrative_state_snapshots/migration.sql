-- CreateTable
CREATE TABLE "NarrativeStateSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "snapshotType" TEXT NOT NULL DEFAULT 'region',
    "payloadVersion" TEXT NOT NULL DEFAULT 'region-v1',
    "label" TEXT,
    "anchorLocationPageId" TEXT,
    "regionKey" TEXT,
    "capturedAtEpochMinute" BIGINT NOT NULL,
    "projectionContextHash" TEXT NOT NULL,
    "projectionSemanticsVersion" TEXT NOT NULL DEFAULT 'narrative-projection-v1',
    "payloadTier" TEXT NOT NULL DEFAULT 'hot',
    "dmPayload" JSON NOT NULL,
    "partyPayload" JSON NOT NULL,
    "compressionAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NarrativeStateSnapshot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NarrativeStateSnapshot_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "PartyRegionVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "locationPageId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "visitedAtEpochMinute" BIGINT NOT NULL,
    "sessionTimelinePointId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartyRegionVisit_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartyRegionVisit_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "NarrativeStateSnapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PartyRegionVisit_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "PartyVisitSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "locationPageId" TEXT NOT NULL,
    "sessionTimelinePointId" TEXT,
    "sourceLabel" TEXT,
    "dismissedAt" DATETIME,
    "promotedSnapshotId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PartyVisitSuggestion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartyVisitSuggestion_promotedSnapshotId_fkey" FOREIGN KEY ("promotedSnapshotId") REFERENCES "NarrativeStateSnapshot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "NarrativeStateSnapshot_campaignId_idx" ON "NarrativeStateSnapshot"("campaignId");
CREATE INDEX "NarrativeStateSnapshot_campaignId_regionKey_idx" ON "NarrativeStateSnapshot"("campaignId", "regionKey");
CREATE INDEX "NarrativeStateSnapshot_campaignId_anchorLocationPageId_idx" ON "NarrativeStateSnapshot"("campaignId", "anchorLocationPageId");
CREATE INDEX "NarrativeStateSnapshot_campaignId_kind_payloadTier_idx" ON "NarrativeStateSnapshot"("campaignId", "kind", "payloadTier");
CREATE INDEX "PartyRegionVisit_campaignId_locationPageId_visitedAtEpochMinute_idx" ON "PartyRegionVisit"("campaignId", "locationPageId", "visitedAtEpochMinute");
CREATE INDEX "PartyRegionVisit_snapshotId_idx" ON "PartyRegionVisit"("snapshotId");
CREATE INDEX "PartyVisitSuggestion_campaignId_locationPageId_idx" ON "PartyVisitSuggestion"("campaignId", "locationPageId");
CREATE INDEX "PartyVisitSuggestion_campaignId_locationPageId_dismissedAt_idx" ON "PartyVisitSuggestion"("campaignId", "locationPageId", "dismissedAt");
