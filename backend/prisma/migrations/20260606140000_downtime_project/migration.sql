-- Layer 1 — downtime project simulation state (wiki-linked narrative surface)
CREATE TABLE "DowntimeProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "wikiPageId" TEXT NOT NULL,
    "ownerPageId" TEXT,
    "havenPageId" TEXT,
    "projectType" TEXT NOT NULL DEFAULT 'operations',
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "priority" TEXT DEFAULT 'normal',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "durationTotalMinutes" BIGINT NOT NULL DEFAULT 0,
    "durationElapsedMinutes" BIGINT NOT NULL DEFAULT 0,
    "startedAtEpochMinute" BIGINT,
    "completedAtEpochMinute" BIGINT,
    "targetCompletionEpochMinute" BIGINT,
    "relatedPageIds" JSON NOT NULL DEFAULT '[]',
    "resources" JSON NOT NULL DEFAULT '[]',
    "blockers" JSON NOT NULL DEFAULT '[]',
    "outcomes" JSON NOT NULL DEFAULT '[]',
    "risks" JSON NOT NULL DEFAULT '[]',
    "semanticsVersion" TEXT NOT NULL DEFAULT 'downtime-project-v1',
    "updatedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DowntimeProject_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DowntimeProject_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DowntimeProject_ownerPageId_fkey" FOREIGN KEY ("ownerPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DowntimeProject_havenPageId_fkey" FOREIGN KEY ("havenPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DowntimeProject_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DowntimeProject_wikiPageId_key" ON "DowntimeProject"("wikiPageId");
CREATE INDEX "DowntimeProject_campaignId_status_idx" ON "DowntimeProject"("campaignId", "status");
CREATE INDEX "DowntimeProject_campaignId_havenPageId_idx" ON "DowntimeProject"("campaignId", "havenPageId");
CREATE INDEX "DowntimeProject_campaignId_priority_idx" ON "DowntimeProject"("campaignId", "priority");
