CREATE TABLE "DowntimePersonRelationship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "characterPageId" TEXT NOT NULL,
    "activeCharacterKey" TEXT,
    "relationshipType" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "havenId" TEXT,
    "projectId" TEXT,
    "compensationAmount" INTEGER,
    "compensationCurrency" TEXT,
    "compensationCadence" TEXT,
    "compensationUnpaid" BOOLEAN NOT NULL DEFAULT false,
    "features" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "startedAtEpochMinute" BIGINT,
    "endedAtEpochMinute" BIGINT,
    "semanticsVersion" TEXT NOT NULL DEFAULT 'downtime-person-v1',
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DowntimePersonRelationship_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DowntimePersonRelationship_characterPageId_fkey" FOREIGN KEY ("characterPageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DowntimePersonRelationship_havenId_fkey" FOREIGN KEY ("havenId") REFERENCES "DowntimeHaven" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DowntimePersonRelationship_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DowntimeProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DowntimePersonRelationship_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "DowntimePersonRelationship_campaignId_status_idx" ON "DowntimePersonRelationship"("campaignId", "status");
CREATE INDEX "DowntimePersonRelationship_campaignId_characterPageId_idx" ON "DowntimePersonRelationship"("campaignId", "characterPageId");
CREATE INDEX "DowntimePersonRelationship_havenId_idx" ON "DowntimePersonRelationship"("havenId");
CREATE INDEX "DowntimePersonRelationship_projectId_idx" ON "DowntimePersonRelationship"("projectId");
CREATE UNIQUE INDEX "DowntimePersonRelationship_campaignId_activeCharacterKey_key" ON "DowntimePersonRelationship"("campaignId", "activeCharacterKey");
