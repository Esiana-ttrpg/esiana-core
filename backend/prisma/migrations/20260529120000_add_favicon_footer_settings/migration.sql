-- Add favicon and footer configuration to SystemSetting
ALTER TABLE "SystemSetting" ADD COLUMN "faviconUrl" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN "footerCustomText" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN "footerTosUrl" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN "footerPrivacyPolicyUrl" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN "footerDiscordUrl" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN "footerGithubUrl" TEXT;
ALTER TABLE "SystemSetting" ADD COLUMN "footerAlignment" TEXT NOT NULL DEFAULT 'center';
