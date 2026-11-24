ALTER TABLE "CalendarEvent" ADD COLUMN "createdByUserId" TEXT CONSTRAINT "CalendarEvent_createdByUserId_fkey" REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD COLUMN "updatedByUserId" TEXT CONSTRAINT "CalendarEvent_updatedByUserId_fkey" REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "CalendarEvent_createdByUserId_idx" ON "CalendarEvent"("createdByUserId");

UPDATE "CampaignEra" SET "createdByUserId" = NULL
WHERE "createdByUserId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "User"."id" = "CampaignEra"."createdByUserId");
UPDATE "CampaignEra" SET "updatedByUserId" = NULL
WHERE "updatedByUserId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" WHERE "User"."id" = "CampaignEra"."updatedByUserId");

ALTER TABLE "CampaignEra" ADD CONSTRAINT "CampaignEra_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CampaignEra" ADD CONSTRAINT "CampaignEra_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "CampaignEra_createdByUserId_idx" ON "CampaignEra"("createdByUserId");

ALTER TABLE "TimeAdvanceSimulationRun" ADD COLUMN "initiatedByUserId" TEXT CONSTRAINT "TimeAdvanceSimulationRun_initiatedByUserId_fkey" REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "TimeAdvanceSimulationRun_initiatedByUserId_idx" ON "TimeAdvanceSimulationRun"("initiatedByUserId");
