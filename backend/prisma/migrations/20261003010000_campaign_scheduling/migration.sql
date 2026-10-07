-- Campaign scheduling foundation: recurrence flags, schedule origin, skip, planned world time.

-- AlterTable Campaign
ALTER TABLE "Campaign" ADD COLUMN "schedulingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Campaign" ADD COLUMN "autoScheduleUpcomingSession" BOOLEAN NOT NULL DEFAULT true;

-- Existing campaigns with cadence text: enable scheduling without inventing a next date.
UPDATE "Campaign" SET "schedulingEnabled" = true WHERE "scheduleFrequency" IS NOT NULL AND TRIM("scheduleFrequency") <> '';

-- AlterTable CampaignSessionSchedule
ALTER TABLE "CampaignSessionSchedule" ADD COLUMN "origin" TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "CampaignSessionSchedule" ADD COLUMN "skipReason" TEXT;
ALTER TABLE "CampaignSessionSchedule" ADD COLUMN "plannedWorldEpochMinute" BIGINT;

CREATE INDEX "CampaignSessionSchedule_origin_status_plannedStartAt_idx" ON "CampaignSessionSchedule"("origin", "status", "plannedStartAt");
