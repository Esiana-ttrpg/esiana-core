-- Create implicit many-to-many join table
CREATE TABLE "_WikiPageToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_WikiPageToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_WikiPageToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "_WikiPageToTag_AB_unique" ON "_WikiPageToTag"("A", "B");
CREATE INDEX "_WikiPageToTag_B_index" ON "_WikiPageToTag"("B");

-- Migrate wiki page tag assignments (if any)
INSERT INTO "_WikiPageToTag" ("A", "B")
SELECT ta."entityId", ta."tagId"
FROM "TagAssignment" ta
WHERE ta."entityType" = 'WIKI_PAGE'
  AND EXISTS (SELECT 1 FROM "WikiPage" wp WHERE wp."id" = ta."entityId")
  AND EXISTS (SELECT 1 FROM "Tag" t WHERE t."id" = ta."tagId");

DROP TABLE "TagAssignment";

-- Rebuild Tag with required label column
CREATE TABLE "Tag_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tag_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "Tag_new" ("id", "campaignId", "name", "label", "color", "createdAt", "updatedAt")
SELECT
    "id",
    "campaignId",
    "name",
    REPLACE(
      UPPER(SUBSTR("name", 1, 1)) || SUBSTR("name", 2),
      '-',
      ' '
    ),
    "color",
    "createdAt",
    "updatedAt"
FROM "Tag";

DROP TABLE "Tag";
ALTER TABLE "Tag_new" RENAME TO "Tag";

CREATE UNIQUE INDEX "Tag_campaignId_name_key" ON "Tag"("campaignId", "name");
CREATE INDEX "Tag_campaignId_idx" ON "Tag"("campaignId");
