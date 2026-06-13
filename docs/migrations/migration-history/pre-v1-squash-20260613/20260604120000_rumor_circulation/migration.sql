-- Layer 3 — append-only rumor circulation edges
CREATE TABLE "RumorCirculation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stableKey" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "edgeKind" TEXT NOT NULL DEFAULT 'circulation',
    "targetKind" TEXT NOT NULL,
    "targetRef" TEXT NOT NULL,
    "stance" TEXT NOT NULL,
    "awarenessScope" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'GM_ONLY',
    "spreadEventId" TEXT NOT NULL,
    "circulatedAtEpochMinute" BIGINT NOT NULL,
    "supersedesCirculationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RumorCirculation_stableKey_key" UNIQUE ("stableKey"),
    CONSTRAINT "RumorCirculation_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "LoreClaim" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RumorCirculation_spreadEventId_fkey" FOREIGN KEY ("spreadEventId") REFERENCES "CalendarEvent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RumorCirculation_supersedesCirculationId_fkey" FOREIGN KEY ("supersedesCirculationId") REFERENCES "RumorCirculation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "RumorCirculation_campaignId_targetKind_targetRef_circulatedAtEpochMinute_idx" ON "RumorCirculation"("campaignId", "targetKind", "targetRef", "circulatedAtEpochMinute");
CREATE INDEX "RumorCirculation_campaignId_targetKind_targetRef_visibility_idx" ON "RumorCirculation"("campaignId", "targetKind", "targetRef", "visibility");
CREATE INDEX "RumorCirculation_campaignId_claimId_circulatedAtEpochMinute_idx" ON "RumorCirculation"("campaignId", "claimId", "circulatedAtEpochMinute");
CREATE INDEX "RumorCirculation_spreadEventId_idx" ON "RumorCirculation"("spreadEventId");
CREATE INDEX "RumorCirculation_supersedesCirculationId_idx" ON "RumorCirculation"("supersedesCirculationId");
