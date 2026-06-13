-- Phase 10A: Account, PluginData, optional passwordHash

PRAGMA foreign_keys=OFF;

CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

CREATE TABLE "PluginData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pluginId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PluginData_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PluginData_pluginId_campaignId_key_key" ON "PluginData"("pluginId", "campaignId", "key");
CREATE INDEX "PluginData_campaignId_idx" ON "PluginData"("campaignId");
CREATE INDEX "PluginData_pluginId_campaignId_idx" ON "PluginData"("pluginId", "campaignId");

-- SQLite: recreate User with optional passwordHash
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "pronouns" TEXT,
    "publicBio" TEXT,
    "statusBlurb" TEXT,
    "bluesky" TEXT,
    "discord" TEXT,
    "github" TEXT,
    "reddit" TEXT,
    "mastodon" TEXT,
    "otherLink" TEXT,
    "defaultPitch" TEXT,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "appearanceProfile" JSONB,
    "allowCampaignSystemOverride" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT,
    "lastLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_User" ("id", "email", "displayName", "avatarUrl", "pronouns", "publicBio", "statusBlurb", "bluesky", "discord", "github", "reddit", "mastodon", "otherLink", "defaultPitch", "passwordHash", "role", "appearanceProfile", "allowCampaignSystemOverride", "timezone", "lastLogin", "createdAt", "updatedAt")
SELECT "id", "email", "displayName", "avatarUrl", "pronouns", "publicBio", "statusBlurb", "bluesky", "discord", "github", "reddit", "mastodon", "otherLink", "defaultPitch", "passwordHash", "role", "appearanceProfile", "allowCampaignSystemOverride", "timezone", "lastLogin", "createdAt", "updatedAt" FROM "User";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

PRAGMA foreign_keys=ON;
