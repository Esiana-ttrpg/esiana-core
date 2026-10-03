-- Character Portfolio: user-owned characters, media, and campaign adventure provenance.
-- Foreign keys are inline (SQLite cannot ALTER TABLE ADD CONSTRAINT).
-- portraitMediaId is a convenience pointer without a DB FK: PortfolioCharacterMedia
-- already references PortfolioCharacter, and SQLite cannot add the reverse constraint later.

CREATE TABLE "UserAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'image',
    "displayUrl" TEXT,
    "thumbnailUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "displayName" TEXT,
    "imageCredit" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAsset_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PortfolioCharacter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "biography" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "tagline" TEXT,
    "roleLabel" TEXT,
    "levelLabel" TEXT,
    "favoritedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "isShowcased" BOOLEAN NOT NULL DEFAULT false,
    "showcaseOrder" INTEGER,
    "portraitMediaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioCharacter_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PortfolioCharacter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PortfolioCharacterAdventure" (
    "id" TEXT NOT NULL,
    "portfolioCharacterId" TEXT NOT NULL,
    "campaignId" TEXT,
    "campaignCharacterPageId" TEXT,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlinkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioCharacterAdventure_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PortfolioCharacterAdventure_portfolioCharacterId_fkey" FOREIGN KEY ("portfolioCharacterId") REFERENCES "PortfolioCharacter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PortfolioCharacterAdventure_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PortfolioCharacterAdventure_campaignCharacterPageId_fkey" FOREIGN KEY ("campaignCharacterPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "PortfolioCharacterMedia" (
    "id" TEXT NOT NULL,
    "portfolioCharacterId" TEXT NOT NULL,
    "userAssetId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "occurredAt" TIMESTAMP(3),
    "adventureId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioCharacterMedia_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PortfolioCharacterMedia_portfolioCharacterId_fkey" FOREIGN KEY ("portfolioCharacterId") REFERENCES "PortfolioCharacter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PortfolioCharacterMedia_userAssetId_fkey" FOREIGN KEY ("userAssetId") REFERENCES "UserAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PortfolioCharacterMedia_adventureId_fkey" FOREIGN KEY ("adventureId") REFERENCES "PortfolioCharacterAdventure" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PortfolioCharacter_portraitMediaId_key" ON "PortfolioCharacter"("portraitMediaId");

CREATE INDEX "UserAsset_userId_idx" ON "UserAsset"("userId");
CREATE INDEX "PortfolioCharacter_userId_idx" ON "PortfolioCharacter"("userId");
CREATE INDEX "PortfolioCharacter_userId_isShowcased_showcaseOrder_idx" ON "PortfolioCharacter"("userId", "isShowcased", "showcaseOrder");
CREATE INDEX "PortfolioCharacter_userId_archivedAt_idx" ON "PortfolioCharacter"("userId", "archivedAt");
CREATE INDEX "PortfolioCharacterMedia_portfolioCharacterId_kind_sortOrder_idx" ON "PortfolioCharacterMedia"("portfolioCharacterId", "kind", "sortOrder");
CREATE INDEX "PortfolioCharacterMedia_userAssetId_idx" ON "PortfolioCharacterMedia"("userAssetId");
CREATE INDEX "PortfolioCharacterMedia_adventureId_idx" ON "PortfolioCharacterMedia"("adventureId");
CREATE INDEX "PortfolioCharacterAdventure_portfolioCharacterId_status_idx" ON "PortfolioCharacterAdventure"("portfolioCharacterId", "status");
CREATE INDEX "PortfolioCharacterAdventure_campaignId_idx" ON "PortfolioCharacterAdventure"("campaignId");
CREATE INDEX "PortfolioCharacterAdventure_campaignCharacterPageId_idx" ON "PortfolioCharacterAdventure"("campaignCharacterPageId");
