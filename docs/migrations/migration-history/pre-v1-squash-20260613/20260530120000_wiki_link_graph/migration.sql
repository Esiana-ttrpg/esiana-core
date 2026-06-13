-- CreateTable
CREATE TABLE "WikiLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "sourcePageId" TEXT NOT NULL,
    "targetPageId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WikiLink_sourcePageId_fkey" FOREIGN KEY ("sourcePageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WikiLink_targetPageId_fkey" FOREIGN KEY ("targetPageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WikiLink_sourcePageId_targetPageId_key" ON "WikiLink"("sourcePageId", "targetPageId");
CREATE INDEX "WikiLink_targetPageId_idx" ON "WikiLink"("targetPageId");
CREATE INDEX "WikiLink_campaignId_targetPageId_idx" ON "WikiLink"("campaignId", "targetPageId");
