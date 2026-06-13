-- Map Presence & Visibility: layers, scene objects, keyframes

CREATE TABLE "MapLayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "mapAssetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MapLayer_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MapLayer_mapAssetId_fkey" FOREIGN KEY ("mapAssetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "MapLayer_mapAssetId_idx" ON "MapLayer"("mapAssetId");
CREATE INDEX "MapLayer_campaignId_idx" ON "MapLayer"("campaignId");

CREATE TABLE "MapSceneObject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "mapAssetId" TEXT NOT NULL,
    "layerId" TEXT,
    "groupId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'pin',
    "label" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'Public',
    "revelation" TEXT NOT NULL DEFAULT 'REVEALED',
    "geometry" JSONB NOT NULL,
    "style" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "mapPinId" TEXT,
    "targetPageId" TEXT,
    "targetAssetId" TEXT,
    "pinType" TEXT,
    "visibleFromEpochMinute" BIGINT,
    "visibleUntilEpochMinute" BIGINT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MapSceneObject_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MapSceneObject_mapAssetId_fkey" FOREIGN KEY ("mapAssetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MapSceneObject_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "MapLayer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MapSceneObject_mapPinId_fkey" FOREIGN KEY ("mapPinId") REFERENCES "MapPin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MapSceneObject_mapPinId_key" ON "MapSceneObject"("mapPinId");
CREATE INDEX "MapSceneObject_mapAssetId_idx" ON "MapSceneObject"("mapAssetId");
CREATE INDEX "MapSceneObject_campaignId_idx" ON "MapSceneObject"("campaignId");
CREATE INDEX "MapSceneObject_layerId_idx" ON "MapSceneObject"("layerId");
CREATE INDEX "MapSceneObject_targetPageId_idx" ON "MapSceneObject"("targetPageId");
CREATE INDEX "MapSceneObject_targetAssetId_idx" ON "MapSceneObject"("targetAssetId");
CREATE INDEX "MapSceneObject_visibleFromEpochMinute_idx" ON "MapSceneObject"("visibleFromEpochMinute");
CREATE INDEX "MapSceneObject_visibleUntilEpochMinute_idx" ON "MapSceneObject"("visibleUntilEpochMinute");

CREATE TABLE "MapObjectKeyframe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sceneObjectId" TEXT NOT NULL,
    "effectiveEpochMinute" BIGINT NOT NULL,
    "geometryOverride" JSONB,
    "styleOverride" JSONB,
    "visibilityOverride" TEXT,
    "revelationOverride" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MapObjectKeyframe_sceneObjectId_fkey" FOREIGN KEY ("sceneObjectId") REFERENCES "MapSceneObject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "MapObjectKeyframe_sceneObjectId_effectiveEpochMinute_idx" ON "MapObjectKeyframe"("sceneObjectId", "effectiveEpochMinute");
