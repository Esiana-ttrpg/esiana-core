-- Fix Json column affinity for SQLite + Prisma (JSON type is not readable; use JSONB like appearanceProfile)

ALTER TABLE "User" DROP COLUMN "gmStyleTags";
ALTER TABLE "User" ADD COLUMN "gmStyleTags" JSONB;

DROP TABLE IF EXISTS "UserCampaignDefaults";
CREATE TABLE "UserCampaignDefaults" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "prefs" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserCampaignDefaults_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
