-- AlterTable
ALTER TABLE "User" ADD COLUMN "appearanceProfile" JSONB;
ALTER TABLE "User" ADD COLUMN "allowCampaignSystemOverride" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "appearanceProfile" JSONB;
