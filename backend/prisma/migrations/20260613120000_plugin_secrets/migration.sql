-- PluginSecret store for encrypted plugin credentials (export-redacted).

CREATE TABLE "PluginSecret" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pluginId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueEnc" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PluginSecret_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PluginSecret_pluginId_campaignId_key_key" ON "PluginSecret"("pluginId", "campaignId", "key");
CREATE INDEX "PluginSecret_campaignId_idx" ON "PluginSecret"("campaignId");
CREATE INDEX "PluginSecret_pluginId_campaignId_idx" ON "PluginSecret"("pluginId", "campaignId");
