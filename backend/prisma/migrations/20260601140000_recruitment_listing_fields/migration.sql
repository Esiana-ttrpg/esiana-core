-- Recruitment listing identity + join request decline context
ALTER TABLE "Campaign" ADD COLUMN "recruitmentTagline" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "recruitmentPremise" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "scheduleTimezone" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "campaignFormat" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "experienceRequired" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "ageRestriction" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "levelRange" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "tableStyleTags" JSONB;

ALTER TABLE "CampaignJoinRequest" ADD COLUMN "declineReasonCode" TEXT;
ALTER TABLE "CampaignJoinRequest" ADD COLUMN "declineMessage" TEXT;
