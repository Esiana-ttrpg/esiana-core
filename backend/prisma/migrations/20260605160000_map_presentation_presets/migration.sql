-- Layer 3 — historical map era presets (epoch shortcuts + default layer toggles)
CREATE TABLE "MapPresentationPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "mapAssetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "anchorEpochMinute" BIGINT NOT NULL,
    "enabledLayerIds" JSON NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MapPresentationPreset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MapPresentationPreset_mapAssetId_fkey" FOREIGN KEY ("mapAssetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "MapPresentationPreset_mapAssetId_idx" ON "MapPresentationPreset"("mapAssetId");
CREATE INDEX "MapPresentationPreset_campaignId_idx" ON "MapPresentationPreset"("campaignId");
