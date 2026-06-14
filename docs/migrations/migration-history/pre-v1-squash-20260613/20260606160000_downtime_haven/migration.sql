-- Layer 1 — downtime haven simulation state (wiki-linked narrative anchor)
CREATE TABLE "DowntimeHaven" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "wikiPageId" TEXT NOT NULL,
    "havenType" TEXT NOT NULL DEFAULT 'sanctuary',
    "status" TEXT NOT NULL DEFAULT 'prosperous',
    "locationPageId" TEXT,
    "scale" TEXT,
    "ownershipType" TEXT,
    "primaryTheme" TEXT,
    "establishedAt" DATETIME,
    "discoveryState" TEXT,
    "residentPageIds" JSON NOT NULL DEFAULT '[]',
    "factionPageIds" JSON NOT NULL DEFAULT '[]',
    "crew" JSON NOT NULL DEFAULT '[]',
    "upgrades" JSON NOT NULL DEFAULT '[]',
    "threats" JSON NOT NULL DEFAULT '[]',
    "passiveBenefits" JSON NOT NULL DEFAULT '[]',
    "activityLog" JSON NOT NULL DEFAULT '[]',
    "relatedPageIds" JSON NOT NULL DEFAULT '[]',
    "simulationHints" JSON NOT NULL DEFAULT '{}',
    "semanticsVersion" TEXT NOT NULL DEFAULT 'downtime-haven-v1',
    "updatedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DowntimeHaven_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DowntimeHaven_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DowntimeHaven_locationPageId_fkey" FOREIGN KEY ("locationPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DowntimeHaven_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DowntimeHaven_wikiPageId_key" ON "DowntimeHaven"("wikiPageId");
CREATE INDEX "DowntimeHaven_campaignId_status_idx" ON "DowntimeHaven"("campaignId", "status");
CREATE INDEX "DowntimeHaven_campaignId_havenType_idx" ON "DowntimeHaven"("campaignId", "havenType");
CREATE INDEX "DowntimeHaven_campaignId_ownershipType_idx" ON "DowntimeHaven"("campaignId", "ownershipType");
CREATE INDEX "DowntimeHaven_campaignId_discoveryState_idx" ON "DowntimeHaven"("campaignId", "discoveryState");
