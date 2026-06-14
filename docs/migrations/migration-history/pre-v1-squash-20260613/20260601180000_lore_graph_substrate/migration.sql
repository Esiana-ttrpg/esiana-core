-- Lore graph substrate: aliases, stats, events, unresolved wikilinks, social mentions

ALTER TABLE "WikiPage" ADD COLUMN "deletedAt" DATETIME;

ALTER TABLE "WikiLink" ADD COLUMN "aliasText" TEXT;
ALTER TABLE "WikiLink" ADD COLUMN "createdByUserId" TEXT;

CREATE TABLE "WikiPageAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WikiPageAlias_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WikiPageAlias_campaignId_normalizedAlias_key" ON "WikiPageAlias"("campaignId", "normalizedAlias");
CREATE INDEX "WikiPageAlias_pageId_idx" ON "WikiPageAlias"("pageId");

CREATE TABLE "WikiPageStats" (
    "pageId" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "characterCount" INTEGER NOT NULL DEFAULT 0,
    "outboundLinkCount" INTEGER NOT NULL DEFAULT 0,
    "inboundLinkCount" INTEGER NOT NULL DEFAULT 0,
    "unresolvedWikilinkCount" INTEGER NOT NULL DEFAULT 0,
    "editCount" INTEGER NOT NULL DEFAULT 0,
    "firstCreatedAt" DATETIME NOT NULL,
    "lastEditedAt" DATETIME NOT NULL,
    "lastEditedByUserId" TEXT,
    "statsComputedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WikiPageStats_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "WikiPageStats_campaignId_idx" ON "WikiPageStats"("campaignId");

CREATE TABLE "NarrativeEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorUserId" TEXT,
    "pageId" TEXT,
    "targetPageId" TEXT,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "NarrativeEvent_campaignId_createdAt_idx" ON "NarrativeEvent"("campaignId", "createdAt");
CREATE INDEX "NarrativeEvent_campaignId_type_createdAt_idx" ON "NarrativeEvent"("campaignId", "type", "createdAt");

CREATE TABLE "UnresolvedWikilink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "sourcePageId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "ignoredByUserId" TEXT,
    "ignoredAt" DATETIME,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnresolvedWikilink_sourcePageId_fkey" FOREIGN KEY ("sourcePageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UnresolvedWikilink_campaignId_sourcePageId_normalizedText_key" ON "UnresolvedWikilink"("campaignId", "sourcePageId", "normalizedText");
CREATE INDEX "UnresolvedWikilink_campaignId_normalizedText_idx" ON "UnresolvedWikilink"("campaignId", "normalizedText");
CREATE INDEX "UnresolvedWikilink_campaignId_status_idx" ON "UnresolvedWikilink"("campaignId", "status");

CREATE TABLE "SocialMention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "sourcePageId" TEXT NOT NULL,
    "mentionType" TEXT NOT NULL,
    "targetUserId" TEXT,
    "identityPageId" TEXT,
    "label" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialMention_sourcePageId_fkey" FOREIGN KEY ("sourcePageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SocialMention_campaignId_targetUserId_idx" ON "SocialMention"("campaignId", "targetUserId");
CREATE INDEX "SocialMention_sourcePageId_idx" ON "SocialMention"("sourcePageId");
