ALTER TABLE "SystemSetting" ADD COLUMN "opdsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemSetting" ADD COLUMN "opdsPublicEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemSetting" ADD COLUMN "opdsPersonalEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemSetting" ADD COLUMN "opdsRecruitingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemSetting" ADD COLUMN "opdsCampaignsEnabled" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "OpdsAuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actorUserId" TEXT NOT NULL,
  "targetUserId" TEXT,
  "action" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
