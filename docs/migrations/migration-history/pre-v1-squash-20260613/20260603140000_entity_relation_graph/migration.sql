-- CreateTable
CREATE TABLE "EntityRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "sourceEntityType" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "targetEntityType" TEXT NOT NULL,
    "targetEntityId" TEXT NOT NULL,
    "relationKind" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'directed',
    "startDate" JSONB,
    "endDate" JSONB,
    "visibility" TEXT,
    "payload" JSONB,
    "sourceDomain" TEXT NOT NULL,
    "sourceRecordKey" TEXT NOT NULL,
    "sourcePageId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EntityRelation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EntityRelation_campaignId_sourceDomain_sourceRecordKey_key" ON "EntityRelation"("campaignId", "sourceDomain", "sourceRecordKey");

-- CreateIndex
CREATE INDEX "EntityRelation_campaignId_sourceEntityType_sourceEntityId_idx" ON "EntityRelation"("campaignId", "sourceEntityType", "sourceEntityId");

-- CreateIndex
CREATE INDEX "EntityRelation_campaignId_targetEntityType_targetEntityId_idx" ON "EntityRelation"("campaignId", "targetEntityType", "targetEntityId");

-- CreateIndex
CREATE INDEX "EntityRelation_campaignId_relationKind_idx" ON "EntityRelation"("campaignId", "relationKind");

-- CreateIndex
CREATE INDEX "EntityRelation_campaignId_sourcePageId_idx" ON "EntityRelation"("campaignId", "sourcePageId");
