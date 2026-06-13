-- Remove unused campaign manifest-link install policy (server-only install model).
ALTER TABLE "SystemSetting" DROP COLUMN "allowCampaignPluginManifestLink";
