ALTER TABLE "CampaignMomentum" ADD COLUMN "erasMigrated" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "CampaignEra" (
  "campaignId" TEXT NOT NULL,
  "id" TEXT NOT NULL,
  "calendarId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  "epochStartMinute" BIGINT,
  "epochEndMinute" BIGINT,
  "visibility" TEXT NOT NULL DEFAULT 'PARTY',
  "overviewPageId" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignEra_pkey" PRIMARY KEY ("campaignId", "id"),
  CONSTRAINT "CampaignEra_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CampaignEra_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "FantasyCalendar"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CampaignEra_overviewPageId_fkey" FOREIGN KEY ("overviewPageId") REFERENCES "WikiPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CampaignEra_overviewPageId_key" ON "CampaignEra"("overviewPageId");
CREATE INDEX "CampaignEra_campaignId_calendarId_sortOrder_idx" ON "CampaignEra"("campaignId", "calendarId", "sortOrder");
