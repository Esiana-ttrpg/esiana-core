-- Rebuild the era table portably; no tables reference its composite key.
BEGIN;
CREATE TABLE "_CampaignEra_documents" AS SELECT * FROM "CampaignEra";
DROP TABLE "CampaignEra";
CREATE TABLE "CampaignEra" (
 "campaignId" TEXT NOT NULL, "id" TEXT NOT NULL, "calendarId" TEXT NOT NULL,
 "name" TEXT NOT NULL, "sortOrder" INTEGER NOT NULL, "isCurrent" BOOLEAN NOT NULL DEFAULT false,
 "epochStartMinute" BIGINT, "epochEndMinute" BIGINT, "visibility" TEXT NOT NULL DEFAULT 'PARTY',
 "overviewPageId" TEXT, "description" TEXT, "createdByUserId" TEXT, "updatedByUserId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CampaignEra_pkey" PRIMARY KEY ("campaignId", "id"),
 CONSTRAINT "CampaignEra_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "CampaignEra_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "FantasyCalendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CampaignEra_overviewPageId_fkey" FOREIGN KEY ("overviewPageId") REFERENCES "WikiPage"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "CampaignEra" ("campaignId", "id", "calendarId", "name", "sortOrder", "isCurrent", "epochStartMinute", "epochEndMinute", "visibility", "overviewPageId", "createdByUserId", "updatedByUserId", "createdAt", "updatedAt")
SELECT "campaignId", "id", "calendarId", "name", "sortOrder", "isCurrent", "epochStartMinute", "epochEndMinute", "visibility", "overviewPageId", "createdByUserId", "updatedByUserId", "createdAt", "updatedAt" FROM "_CampaignEra_documents";
DROP TABLE "_CampaignEra_documents";
CREATE UNIQUE INDEX "CampaignEra_overviewPageId_key" ON "CampaignEra"("overviewPageId");
CREATE INDEX "CampaignEra_campaignId_calendarId_sortOrder_idx" ON "CampaignEra"("campaignId", "calendarId", "sortOrder");
ALTER TABLE "CalendarEvent" ADD COLUMN "wikiPageId" TEXT;
UPDATE "CalendarEvent" SET "wikiPageId" = (SELECT "id" FROM "WikiPage" WHERE "id" = 'event-' || "CalendarEvent"."id" AND "campaignId" = (SELECT "campaignId" FROM "FantasyCalendar" WHERE "id" = "CalendarEvent"."calendarId") AND "deletedAt" IS NULL);
CREATE TABLE "ChronologyRoute" (
 "campaignId" TEXT NOT NULL, "entityType" TEXT NOT NULL, "slug" TEXT NOT NULL,
 "entityId" TEXT NOT NULL, "title" TEXT NOT NULL, "canonical" BOOLEAN NOT NULL DEFAULT true,
 CONSTRAINT "ChronologyRoute_pkey" PRIMARY KEY ("campaignId", "entityType", "slug"),
 CONSTRAINT "ChronologyRoute_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ChronologyRoute_campaignId_entityType_entityId_idx" ON "ChronologyRoute"("campaignId", "entityType", "entityId");
COMMIT;
