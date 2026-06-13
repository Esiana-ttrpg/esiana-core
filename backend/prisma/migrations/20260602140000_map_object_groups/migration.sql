-- CreateTable
CREATE TABLE "MapObjectGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "mapAssetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MapObjectGroup_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MapObjectGroup_mapAssetId_fkey" FOREIGN KEY ("mapAssetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MapObjectGroup_mapAssetId_idx" ON "MapObjectGroup"("mapAssetId");
CREATE INDEX "MapObjectGroup_campaignId_idx" ON "MapObjectGroup"("campaignId");

-- CreateIndex
CREATE INDEX "MapSceneObject_groupId_idx" ON "MapSceneObject"("groupId");
