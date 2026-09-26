CREATE TABLE "CharacterField" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "characterPageId" TEXT NOT NULL,
    "pageTabId" TEXT,
    "fieldKey" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "pluginId" TEXT,
    "sourceKey" TEXT,
    "providerKey" TEXT,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "value" JSONB,
    "validation" JSONB,
    "capabilities" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CharacterField_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CharacterField_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterField_characterPageId_fkey" FOREIGN KEY ("characterPageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterField_pageTabId_fkey" FOREIGN KEY ("pageTabId") REFERENCES "CharacterPageTab" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CharacterField_characterPageId_fieldKey_key" ON "CharacterField"("characterPageId", "fieldKey");
CREATE INDEX "CharacterField_campaignId_characterPageId_updatedAt_idx" ON "CharacterField"("campaignId", "characterPageId", "updatedAt");
CREATE INDEX "CharacterField_characterPageId_pluginId_sourceKey_providerKey_idx" ON "CharacterField"("characterPageId", "pluginId", "sourceKey", "providerKey");
