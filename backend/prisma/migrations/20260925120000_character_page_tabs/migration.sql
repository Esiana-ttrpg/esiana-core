CREATE TABLE "PluginCharacterPageState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "characterPageId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "pluginSchemaVersion" INTEGER NOT NULL,
    "providerState" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "renderer" TEXT,
    "definition" JSONB,
    "pluginData" JSONB,
    "retainedBlocks" JSONB,
    "retainedTitle" TEXT,
    "retainedDisplayOrder" INTEGER,
    "retainedVisibility" TEXT,
    "retainedRenderMode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PluginCharacterPageState_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PluginCharacterPageState_characterPageId_fkey" FOREIGN KEY ("characterPageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "CharacterPageTab" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "characterPageId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "renderMode" TEXT NOT NULL,
    "coreKey" TEXT,
    "title" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "visibility" TEXT,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "pluginStateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CharacterPageTab_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterPageTab_characterPageId_fkey" FOREIGN KEY ("characterPageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterPageTab_pluginStateId_fkey" FOREIGN KEY ("pluginStateId") REFERENCES "PluginCharacterPageState"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PluginCharacterPageState_characterPageId_pluginId_sourceKey_key" ON "PluginCharacterPageState"("characterPageId", "pluginId", "sourceKey");
CREATE INDEX "PluginCharacterPageState_campaignId_pluginId_providerState_idx" ON "PluginCharacterPageState"("campaignId", "pluginId", "providerState");
CREATE UNIQUE INDEX "CharacterPageTab_pluginStateId_key" ON "CharacterPageTab"("pluginStateId");
CREATE UNIQUE INDEX "CharacterPageTab_characterPageId_coreKey_key" ON "CharacterPageTab"("characterPageId", "coreKey");
CREATE INDEX "CharacterPageTab_campaignId_characterPageId_displayOrder_idx" ON "CharacterPageTab"("campaignId", "characterPageId", "displayOrder");
