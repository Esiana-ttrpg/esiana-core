-- Derived search projection for Global Search candidate retrieval.
-- partyVector / elevatedVector are PostgreSQL tsvector columns with GIN indexes.
-- partyVector = party-visible text; elevatedVector = full document (party +
-- elevated) so elevated viewers can match with a single @@ against elevatedVector.
-- SQLite deploy normalizer maps tsvector → TEXT and drops GIN indexes.
-- Foreign key is inline (SQLite cannot ALTER TABLE ADD CONSTRAINT).

CREATE TABLE "SearchIndexDocument" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "typeKey" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleNorm" TEXT NOT NULL,
    "aliasText" TEXT NOT NULL DEFAULT '',
    "metadataText" TEXT NOT NULL DEFAULT '',
    "customFieldText" TEXT NOT NULL DEFAULT '',
    "bodyText" TEXT NOT NULL DEFAULT '',
    "elevatedText" TEXT NOT NULL DEFAULT '',
    "sourceUpdatedAt" TIMESTAMP(3) NOT NULL,
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "partyVector" tsvector,
    "elevatedVector" tsvector,

    CONSTRAINT "SearchIndexDocument_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SearchIndexDocument_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SearchIndexDocument_sourceKind_sourceId_key" ON "SearchIndexDocument"("sourceKind", "sourceId");

CREATE INDEX "SearchIndexDocument_campaignId_typeKey_idx" ON "SearchIndexDocument"("campaignId", "typeKey");

CREATE INDEX "SearchIndexDocument_campaignId_visibility_idx" ON "SearchIndexDocument"("campaignId", "visibility");

CREATE INDEX "SearchIndexDocument_partyVector_idx" ON "SearchIndexDocument" USING GIN ("partyVector");

CREATE INDEX "SearchIndexDocument_elevatedVector_idx" ON "SearchIndexDocument" USING GIN ("elevatedVector");
