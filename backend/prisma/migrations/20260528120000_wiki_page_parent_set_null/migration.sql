-- Redeclare WikiPage parent FK with ON DELETE SET NULL (was CASCADE).
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_WikiPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "notebookArcId" TEXT,
    "title" TEXT NOT NULL,
    "parentId" TEXT,
    "featuredImageId" TEXT,
    "blocks" JSON NOT NULL DEFAULT '[]',
    "templateType" TEXT NOT NULL DEFAULT 'DEFAULT',
    "visibility" TEXT NOT NULL,
    "metadata" JSON,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WikiPage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WikiPage_notebookArcId_fkey" FOREIGN KEY ("notebookArcId") REFERENCES "NoteBookArc" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WikiPage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WikiPage_featuredImageId_fkey" FOREIGN KEY ("featuredImageId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_WikiPage" ("id", "campaignId", "notebookArcId", "title", "parentId", "featuredImageId", "blocks", "templateType", "visibility", "metadata", "createdAt", "updatedAt")
SELECT "id", "campaignId", "notebookArcId", "title", "parentId", "featuredImageId", "blocks", "templateType", "visibility", "metadata", "createdAt", "updatedAt" FROM "WikiPage";

DROP TABLE "WikiPage";
ALTER TABLE "new_WikiPage" RENAME TO "WikiPage";

CREATE INDEX "WikiPage_campaignId_idx" ON "WikiPage"("campaignId");
CREATE INDEX "WikiPage_parentId_idx" ON "WikiPage"("parentId");
CREATE INDEX "WikiPage_notebookArcId_idx" ON "WikiPage"("notebookArcId");

PRAGMA foreign_keys=ON;
