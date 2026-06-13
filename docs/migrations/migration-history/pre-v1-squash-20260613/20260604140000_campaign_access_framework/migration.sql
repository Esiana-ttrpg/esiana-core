-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

ALTER TABLE "CampaignMember" ADD COLUMN "chronologyContributor" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Campaign" ADD COLUMN "campaignOwnerUserId" TEXT;

UPDATE "Campaign"
SET "campaignOwnerUserId" = (
  SELECT cm."userId"
  FROM "CampaignMember" cm
  WHERE cm."campaignId" = "Campaign"."id" AND cm."role" = 'DM'
  ORDER BY cm."createdAt" ASC
  LIMIT 1
)
WHERE "campaignOwnerUserId" IS NULL;

UPDATE "Campaign"
SET "campaignOwnerUserId" = (
  SELECT cm."userId"
  FROM "CampaignMember" cm
  WHERE cm."campaignId" = "Campaign"."id"
  ORDER BY cm."createdAt" ASC
  LIMIT 1
)
WHERE "campaignOwnerUserId" IS NULL;

UPDATE "CampaignMember" SET "chronologyContributor" = true WHERE "role" = 'Player';

UPDATE "CampaignMember" SET "role" = 'GAMEMASTER' WHERE "role" = 'DM';
UPDATE "CampaignMember" SET "role" = 'WRITER' WHERE "role" = 'Co-DM';
UPDATE "CampaignMember" SET "role" = 'PARTICIPANT' WHERE "role" IN ('Member', 'Player');
UPDATE "CampaignMember" SET "role" = 'OBSERVER' WHERE "role" = 'Viewer';

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "inviteToken" TEXT,
    "description" TEXT,
    "campaignOwnerUserId" TEXT NOT NULL,
    "isPublicViewable" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT DEFAULT 'English',
    "gameSystem" TEXT DEFAULT 'dnd-5e',
    "customGameSystemName" TEXT,
    "themePreset" TEXT NOT NULL DEFAULT 'dark',
    "appearanceProfile" JSONB,
    "isLookingForGroup" BOOLEAN NOT NULL DEFAULT false,
    "recruitmentTagline" TEXT,
    "recruitmentPremise" TEXT,
    "recruitmentBeforeApplyNote" TEXT,
    "scheduleFrequency" TEXT,
    "scheduleDay" TEXT,
    "scheduleTime" TEXT,
    "scheduleTimezone" TEXT,
    "currentSession" INTEGER NOT NULL DEFAULT 0,
    "sessionDuration" TEXT,
    "estimatedLength" TEXT,
    "campaignFormat" TEXT,
    "experienceRequired" TEXT,
    "ageRestriction" TEXT,
    "levelRange" TEXT,
    "tableStyleTags" JSONB,
    "maxSeats" INTEGER NOT NULL DEFAULT 0,
    "maxPlayers" INTEGER NOT NULL DEFAULT 5,
    "genreThemes" JSONB,
    "externalTools" JSONB,
    "safetyTools" TEXT,
    "contentWarnings" TEXT,
    "equipmentNeeded" TEXT,
    "includeRules" BOOLEAN NOT NULL DEFAULT false,
    "includeFAQ" BOOLEAN NOT NULL DEFAULT false,
    "includeSessionZero" BOOLEAN NOT NULL DEFAULT false,
    "includeHomebrew" BOOLEAN NOT NULL DEFAULT false,
    "includeSafetyGuidelines" BOOLEAN NOT NULL DEFAULT false,
    "includeCharacterCreation" BOOLEAN NOT NULL DEFAULT false,
    "includeTableExpectations" BOOLEAN NOT NULL DEFAULT false,
    "allowPlayerChronologyManagement" BOOLEAN NOT NULL DEFAULT false,
    "sidebarConfig" JSONB,
    "dashboardConfig" JSONB,
    "ensembleConfig" JSONB,
    "templateSettings" JSONB,
    "currentEpochMinute" BIGINT NOT NULL DEFAULT 0,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Campaign_campaignOwnerUserId_fkey" FOREIGN KEY ("campaignOwnerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Campaign" ("id", "name", "slug", "inviteToken", "description", "campaignOwnerUserId", "isPublicViewable", "isPublic", "views", "followers", "language", "gameSystem", "customGameSystemName", "themePreset", "appearanceProfile", "isLookingForGroup", "recruitmentTagline", "recruitmentPremise", "recruitmentBeforeApplyNote", "scheduleFrequency", "scheduleDay", "scheduleTime", "scheduleTimezone", "currentSession", "sessionDuration", "estimatedLength", "campaignFormat", "experienceRequired", "ageRestriction", "levelRange", "tableStyleTags", "maxSeats", "maxPlayers", "genreThemes", "externalTools", "safetyTools", "contentWarnings", "equipmentNeeded", "includeRules", "includeFAQ", "includeSessionZero", "includeHomebrew", "includeSafetyGuidelines", "includeCharacterCreation", "includeTableExpectations", "allowPlayerChronologyManagement", "sidebarConfig", "dashboardConfig", "ensembleConfig", "templateSettings", "currentEpochMinute", "archivedAt", "createdAt", "updatedAt")
SELECT "id", "name", "slug", "inviteToken", "description", "campaignOwnerUserId", "isPublicViewable", "isPublic", "views", "followers", "language", "gameSystem", "customGameSystemName", "themePreset", "appearanceProfile", "isLookingForGroup", "recruitmentTagline", "recruitmentPremise", "recruitmentBeforeApplyNote", "scheduleFrequency", "scheduleDay", "scheduleTime", "scheduleTimezone", "currentSession", "sessionDuration", "estimatedLength", "campaignFormat", "experienceRequired", "ageRestriction", "levelRange", "tableStyleTags", "maxSeats", "maxPlayers", "genreThemes", "externalTools", "safetyTools", "contentWarnings", "equipmentNeeded", "includeRules", "includeFAQ", "includeSessionZero", "includeHomebrew", "includeSafetyGuidelines", "includeCharacterCreation", "includeTableExpectations", "allowPlayerChronologyManagement", "sidebarConfig", "dashboardConfig", "ensembleConfig", "templateSettings", "currentEpochMinute", "archivedAt", "createdAt", "updatedAt"
FROM "Campaign"
WHERE "campaignOwnerUserId" IS NOT NULL;

DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";

CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");
CREATE UNIQUE INDEX "Campaign_inviteToken_key" ON "Campaign"("inviteToken");
CREATE INDEX "Campaign_archivedAt_idx" ON "Campaign"("archivedAt");
CREATE INDEX "Campaign_campaignOwnerUserId_idx" ON "Campaign"("campaignOwnerUserId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
