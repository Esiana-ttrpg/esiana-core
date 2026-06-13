-- Campaign discoverability: replace isPublicViewable + isPublic with single column
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

ALTER TABLE "Campaign" ADD COLUMN "discoverability" TEXT NOT NULL DEFAULT 'private';

UPDATE "Campaign"
SET "discoverability" = CASE
  WHEN "isPublicViewable" = 0 THEN 'private'
  WHEN "isPublic" = 1 THEN 'public'
  ELSE 'unlisted'
END;

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "inviteToken" TEXT,
    "description" TEXT,
    "campaignOwnerUserId" TEXT NOT NULL,
    "discoverability" TEXT NOT NULL DEFAULT 'private',
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
    "creativeDriftDispositions" JSONB,
    "downtimeGapOverlays" JSONB,
    "ensembleConfig" JSONB,
    "currentEpochMinute" BIGINT NOT NULL DEFAULT 0,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Campaign_campaignOwnerUserId_fkey" FOREIGN KEY ("campaignOwnerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Campaign" (
    "id", "name", "handle", "inviteToken", "description", "campaignOwnerUserId",
    "discoverability", "views", "followers", "language", "gameSystem", "customGameSystemName",
    "themePreset", "appearanceProfile", "isLookingForGroup", "recruitmentTagline",
    "recruitmentPremise", "recruitmentBeforeApplyNote", "scheduleFrequency", "scheduleDay",
    "scheduleTime", "scheduleTimezone", "currentSession", "sessionDuration", "estimatedLength",
    "campaignFormat", "experienceRequired", "ageRestriction", "levelRange", "tableStyleTags",
    "maxSeats", "maxPlayers", "genreThemes", "externalTools", "safetyTools", "contentWarnings",
    "equipmentNeeded", "includeRules", "includeFAQ", "includeSessionZero", "includeHomebrew",
    "includeSafetyGuidelines", "includeCharacterCreation", "includeTableExpectations",
    "allowPlayerChronologyManagement", "sidebarConfig", "dashboardConfig",
    "creativeDriftDispositions", "downtimeGapOverlays", "ensembleConfig", "currentEpochMinute",
    "archivedAt", "createdAt", "updatedAt"
)
SELECT
    "id", "name", "handle", "inviteToken", "description", "campaignOwnerUserId",
    "discoverability", "views", "followers", "language", "gameSystem", "customGameSystemName",
    "themePreset", "appearanceProfile", "isLookingForGroup", "recruitmentTagline",
    "recruitmentPremise", "recruitmentBeforeApplyNote", "scheduleFrequency", "scheduleDay",
    "scheduleTime", "scheduleTimezone", "currentSession", "sessionDuration", "estimatedLength",
    "campaignFormat", "experienceRequired", "ageRestriction", "levelRange", "tableStyleTags",
    "maxSeats", "maxPlayers", "genreThemes", "externalTools", "safetyTools", "contentWarnings",
    "equipmentNeeded", "includeRules", "includeFAQ", "includeSessionZero", "includeHomebrew",
    "includeSafetyGuidelines", "includeCharacterCreation", "includeTableExpectations",
    "allowPlayerChronologyManagement", "sidebarConfig", "dashboardConfig",
    "creativeDriftDispositions", "downtimeGapOverlays", "ensembleConfig", "currentEpochMinute",
    "archivedAt", "createdAt", "updatedAt"
FROM "Campaign";

DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";

CREATE UNIQUE INDEX "Campaign_handle_key" ON "Campaign"("handle");
CREATE UNIQUE INDEX "Campaign_inviteToken_key" ON "Campaign"("inviteToken");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
