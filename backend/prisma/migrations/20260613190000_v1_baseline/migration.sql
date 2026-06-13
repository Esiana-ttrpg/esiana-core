-- v1.0 pre-release baseline squash (2026-06-13)
-- Replaces 78 incremental migrations archived under docs/migrations/migration-history/pre-v1-squash-20260613/
-- Schema source: prisma/schema.prisma at squash time. No intentional schema changes.
-- Generated via: prisma migrate diff --from-empty --to-schema-datamodel (sqlite provider for dual-engine portability)
-- Portable JSON defaults: {} and [] written as quoted string literals for SQLite + Postgres parity
-- Portable timestamps: DATETIME from sqlite diff normalized to TIMESTAMP(3) for Postgres deploy parity

-- CreateTable
CREATE TABLE "User" (
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
    "gmStyleTags" JSONB,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "appearanceProfile" JSONB,
    "allowCampaignSystemOverride" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "UserCampaignDefaults" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "prefs" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserCampaignDefaults_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserTemplateResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "markdown" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserTemplateResource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiRequestLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT,
    "userId" TEXT,
    "apiTokenId" TEXT,
    "statusCode" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiRequestLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApiRequestLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApiRequestLog_apiTokenId_fkey" FOREIGN KEY ("apiTokenId") REFERENCES "UserToken" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'GLOBAL_CONFIG',
    "allowRegistrations" BOOLEAN NOT NULL DEFAULT true,
    "allowedDomains" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER DEFAULT 587,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpFromAddress" TEXT,
    "maxUploadSizeMb" INTEGER NOT NULL DEFAULT 10,
    "mapMaxUploadSizeMb" INTEGER,
    "mapDisplayMaxEdge" INTEGER NOT NULL DEFAULT 8192,
    "mapThumbMaxEdge" INTEGER NOT NULL DEFAULT 2048,
    "mapPreserveFullRes" BOOLEAN NOT NULL DEFAULT true,
    "allowedImageTypes" TEXT DEFAULT 'png,jpeg,webp',
    "maxImageWidth" INTEGER NOT NULL DEFAULT 16384,
    "maxImageHeight" INTEGER NOT NULL DEFAULT 16384,
    "urlImportsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "urlImportAllowHttp" BOOLEAN NOT NULL DEFAULT false,
    "urlImportMaxDownloadMb" INTEGER NOT NULL DEFAULT 50,
    "urlImportTimeoutSeconds" INTEGER NOT NULL DEFAULT 15,
    "relationsMaxVisibleNodes" INTEGER,
    "relationsMaxVisibleEdges" INTEGER,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "systemBannerText" TEXT,
    "systemBannerExpiresAt" TIMESTAMP(3),
    "pluginRegistryUrl" TEXT NOT NULL DEFAULT 'https://raw.githubusercontent.com/Esiana-ttrpg/community-plugins/main/registry.json',
    "globalTitle" TEXT NOT NULL DEFAULT 'Esiana',
    "globalLogoUrl" TEXT,
    "faviconUrl" TEXT,
    "globalThemePreset" TEXT NOT NULL DEFAULT 'dark',
    "globalPalette" TEXT NOT NULL DEFAULT 'ocean',
    "applyBackgroundTint" BOOLEAN NOT NULL DEFAULT false,
    "appearanceProfile" JSONB,
    "footerCustomText" TEXT,
    "footerTosUrl" TEXT,
    "footerPrivacyPolicyUrl" TEXT,
    "footerDiscordUrl" TEXT,
    "footerGithubUrl" TEXT,
    "footerAlignment" TEXT NOT NULL DEFAULT 'center',
    "notificationPollIntervalSeconds" INTEGER NOT NULL DEFAULT 60,
    "defaultTimezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "SystemPlugin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "config" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "CampaignPluginSetting" (
    "campaignId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("campaignId", "pluginId"),
    CONSTRAINT "CampaignPluginSetting_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignPluginSetting_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "SystemPlugin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignJoinRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "declineReasonCode" TEXT,
    "declineMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignJoinRequest_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "scopes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IdentityProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "template" TEXT NOT NULL DEFAULT 'oidc',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT NOT NULL,
    "issuerUrl" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecretEnc" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT 'openid profile email',
    "tenantId" TEXT,
    "groupsClaim" TEXT,
    "groupRoleMappings" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "OidcAuthState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "state" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "userId" TEXT,
    "codeVerifier" TEXT NOT NULL,
    "returnTo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "idpGroups" JSONB,
    "groupsSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PluginData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pluginId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PluginData_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PluginSecret" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pluginId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueEnc" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PluginSecret_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Campaign" (
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
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Campaign_campaignOwnerUserId_fkey" FOREIGN KEY ("campaignOwnerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DowntimeProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "wikiPageId" TEXT NOT NULL,
    "ownerPageId" TEXT,
    "havenPageId" TEXT,
    "projectType" TEXT NOT NULL DEFAULT 'operations',
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "priority" TEXT DEFAULT 'normal',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "durationTotalMinutes" BIGINT NOT NULL DEFAULT 0,
    "durationElapsedMinutes" BIGINT NOT NULL DEFAULT 0,
    "stalledDurationMinutes" BIGINT NOT NULL DEFAULT 0,
    "startedAtEpochMinute" BIGINT,
    "completedAtEpochMinute" BIGINT,
    "targetCompletionEpochMinute" BIGINT,
    "relatedPageIds" JSONB NOT NULL DEFAULT '[]',
    "resources" JSONB NOT NULL DEFAULT '[]',
    "blockers" JSONB NOT NULL DEFAULT '[]',
    "outcomes" JSONB NOT NULL DEFAULT '[]',
    "risks" JSONB NOT NULL DEFAULT '[]',
    "semanticsVersion" TEXT NOT NULL DEFAULT 'downtime-project-v1',
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DowntimeProject_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DowntimeProject_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DowntimeProject_ownerPageId_fkey" FOREIGN KEY ("ownerPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DowntimeProject_havenPageId_fkey" FOREIGN KEY ("havenPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DowntimeProject_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DowntimeHaven" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "wikiPageId" TEXT NOT NULL,
    "havenType" TEXT NOT NULL DEFAULT 'sanctuary',
    "status" TEXT NOT NULL DEFAULT 'prosperous',
    "locationPageId" TEXT,
    "scale" TEXT,
    "ownershipType" TEXT,
    "primaryTheme" TEXT,
    "establishedAt" TIMESTAMP(3),
    "discoveryState" TEXT,
    "residentPageIds" JSONB NOT NULL DEFAULT '[]',
    "factionPageIds" JSONB NOT NULL DEFAULT '[]',
    "crew" JSONB NOT NULL DEFAULT '[]',
    "upgrades" JSONB NOT NULL DEFAULT '[]',
    "threats" JSONB NOT NULL DEFAULT '[]',
    "passiveBenefits" JSONB NOT NULL DEFAULT '[]',
    "activityLog" JSONB NOT NULL DEFAULT '[]',
    "relatedPageIds" JSONB NOT NULL DEFAULT '[]',
    "identityHints" JSONB NOT NULL DEFAULT '{}',
    "references" JSONB NOT NULL DEFAULT '[]',
    "spaces" JSONB NOT NULL DEFAULT '[]',
    "simulationHints" JSONB NOT NULL DEFAULT '{}',
    "semanticsVersion" TEXT NOT NULL DEFAULT 'downtime-haven-v2',
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DowntimeHaven_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DowntimeHaven_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DowntimeHaven_locationPageId_fkey" FOREIGN KEY ("locationPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DowntimeHaven_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "currencyLabel" TEXT NOT NULL DEFAULT 'gold',
    "currencySuffix" TEXT NOT NULL DEFAULT 'g',
    "openingBalance" INTEGER NOT NULL DEFAULT 0,
    "sharedTreasuryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "semanticsVersion" TEXT NOT NULL DEFAULT 'campaign-ledger-v1',
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignLedger_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedger_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignLedgerEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "entryKind" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "title" TEXT NOT NULL,
    "narrative" TEXT,
    "amount" INTEGER NOT NULL,
    "occurredAtEpochMinute" BIGINT NOT NULL,
    "projectId" TEXT,
    "havenWikiPageId" TEXT,
    "debtMeta" JSONB,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "contributorPageId" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignLedgerEntry_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerEntry_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "CampaignLedger" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DowntimeProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerEntry_havenWikiPageId_fkey" FOREIGN KEY ("havenWikiPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerEntry_contributorPageId_fkey" FOREIGN KEY ("contributorPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerEntry_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignLedgerSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "ledgerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "entryKind" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "title" TEXT NOT NULL,
    "narrative" TEXT,
    "amount" INTEGER,
    "occurredAtEpochMinute" BIGINT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "projectId" TEXT,
    "havenWikiPageId" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'inferred',
    "acceptedEntryId" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignLedgerSuggestion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerSuggestion_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "CampaignLedger" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerSuggestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DowntimeProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerSuggestion_havenWikiPageId_fkey" FOREIGN KEY ("havenWikiPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerSuggestion_acceptedEntryId_fkey" FOREIGN KEY ("acceptedEntryId") REFERENCES "CampaignLedgerEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignLedgerSuggestion_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignScheduledEffect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "effectKind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "narrative" TEXT,
    "recurrenceRule" JSONB NOT NULL,
    "anchorEpochMinute" BIGINT NOT NULL,
    "nextFireEpochMinute" BIGINT NOT NULL,
    "lastFiredEpochMinute" BIGINT,
    "effectPayload" JSONB,
    "ledgerEntryKind" TEXT,
    "ledgerCategory" TEXT,
    "amount" INTEGER,
    "havenWikiPageId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignScheduledEffect_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignScheduledEffect_havenWikiPageId_fkey" FOREIGN KEY ("havenWikiPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignScheduledEffect_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignScheduledEffectOccurrence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "scheduledEffectId" TEXT NOT NULL,
    "effectKind" TEXT NOT NULL,
    "fireAtEpochMinute" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "suppressionReason" TEXT,
    "worldEventSuggestionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignScheduledEffectOccurrence_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignScheduledEffectOccurrence_scheduledEffectId_fkey" FOREIGN KEY ("scheduledEffectId") REFERENCES "CampaignScheduledEffect" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignScheduledEffectOccurrence_worldEventSuggestionId_fkey" FOREIGN KEY ("worldEventSuggestionId") REFERENCES "CampaignWorldEventSuggestion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignReputation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "simulationState" JSONB NOT NULL DEFAULT '{}',
    "semanticsVersion" TEXT NOT NULL DEFAULT 'campaign-reputation-v1',
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignReputation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputation_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignReputationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "reputationId" TEXT NOT NULL,
    "factionPageId" TEXT NOT NULL,
    "eventKind" TEXT NOT NULL,
    "axis" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'flat',
    "fromBand" TEXT,
    "toBand" TEXT,
    "title" TEXT NOT NULL,
    "narrative" TEXT,
    "occurredAtEpochMinute" BIGINT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'other',
    "sourceRef" TEXT NOT NULL,
    "projectId" TEXT,
    "havenWikiPageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignReputationEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationEvent_reputationId_fkey" FOREIGN KEY ("reputationId") REFERENCES "CampaignReputation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationEvent_factionPageId_fkey" FOREIGN KEY ("factionPageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DowntimeProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationEvent_havenWikiPageId_fkey" FOREIGN KEY ("havenWikiPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignReputationSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "reputationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "kind" TEXT NOT NULL,
    "factionPageId" TEXT NOT NULL,
    "axis" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'flat',
    "fromBand" TEXT,
    "toBand" TEXT,
    "title" TEXT NOT NULL,
    "narrative" TEXT,
    "occurredAtEpochMinute" BIGINT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'other',
    "sourceRef" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "projectId" TEXT,
    "havenWikiPageId" TEXT,
    "claimId" TEXT,
    "targetOrgPageId" TEXT,
    "proposedTrust" INTEGER,
    "proposedNotoriety" INTEGER,
    "acceptedEventId" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignReputationSuggestion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationSuggestion_reputationId_fkey" FOREIGN KEY ("reputationId") REFERENCES "CampaignReputation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationSuggestion_factionPageId_fkey" FOREIGN KEY ("factionPageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationSuggestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "DowntimeProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationSuggestion_havenWikiPageId_fkey" FOREIGN KEY ("havenWikiPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationSuggestion_acceptedEventId_fkey" FOREIGN KEY ("acceptedEventId") REFERENCES "CampaignReputationEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignReputationSuggestion_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignMomentum" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "state" JSONB NOT NULL DEFAULT '{}',
    "semanticsVersion" TEXT NOT NULL DEFAULT 'campaign-momentum-v1',
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignMomentum_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignMomentum_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignWorldEventSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "narrative" TEXT,
    "occurredAtEpochMinute" BIGINT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'time_hook',
    "sourceRef" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "primaryOrgPageId" TEXT,
    "eraId" TEXT,
    "momentumState" TEXT,
    "trendDirection" TEXT,
    "acceptedCalendarEventId" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "developmentPayload" JSONB,
    "expiresAt" TIMESTAMP(3),
    "advanceCycleCount" INTEGER NOT NULL DEFAULT 0,
    "parentSuggestionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignWorldEventSuggestion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignWorldEventSuggestion_primaryOrgPageId_fkey" FOREIGN KEY ("primaryOrgPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignWorldEventSuggestion_acceptedCalendarEventId_fkey" FOREIGN KEY ("acceptedCalendarEventId") REFERENCES "CalendarEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignWorldEventSuggestion_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NarrativeLifecycleState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "subjectKind" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "lifecycleState" TEXT NOT NULL,
    "semanticsVersion" TEXT NOT NULL DEFAULT 'narrative-lifecycle-v1',
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NarrativeLifecycleState_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NarrativeLifecycleState_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PageNarrativeStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "wikiPageId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT,
    "semanticsVersion" TEXT NOT NULL DEFAULT 'page-narrative-status-v1',
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PageNarrativeStatus_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PageNarrativeStatus_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PageNarrativeStatus_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NarrativeBranchState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "activeNodeId" TEXT NOT NULL,
    "semanticsVersion" TEXT NOT NULL DEFAULT 'narrative-branch-v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NarrativeBranchState_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NarrativeConsequenceReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "semanticsVersion" TEXT NOT NULL DEFAULT 'narrative-consequence-v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NarrativeConsequenceReceipt_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeAdvanceSimulationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "previousEpochMinute" BIGINT NOT NULL,
    "nextEpochMinute" BIGINT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRef" TEXT,
    "semanticsVersion" TEXT NOT NULL DEFAULT 'time-hooks-v1',
    "receipt" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimeAdvanceSimulationRun_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorldAdvanceReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "effectId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "chronologyEventId" TEXT NOT NULL,
    "semanticsVersion" TEXT NOT NULL DEFAULT 'world-advance-v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorldAdvanceReceipt_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "parentContext" TEXT,
    "pageSizeBytes" INTEGER,
    "deltaBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignActivity_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FantasyCalendar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isMasterTime" BOOLEAN NOT NULL DEFAULT false,
    "epochOffset" BIGINT NOT NULL DEFAULT 0,
    "weekdays" JSONB NOT NULL,
    "months" JSONB NOT NULL,
    "seasons" JSONB NOT NULL,
    "moons" JSONB NOT NULL,
    "leapDays" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FantasyCalendar_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalendarEventCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CalendarEventCategory_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "calendarId" TEXT NOT NULL,
    "categoryId" TEXT,
    "prerequisiteId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PARTY',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 1,
    "isRepeating" BOOLEAN NOT NULL DEFAULT false,
    "repeatInterval" INTEGER,
    "repeatUnit" TEXT,
    "limitRepetitions" INTEGER,
    "conditions" JSONB,
    "moonOverrides" JSONB,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "targetYear" INTEGER,
    "targetMonth" INTEGER,
    "targetDay" INTEGER,
    "targetEpochMinute" BIGINT,
    "recurrenceRule" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CalendarEvent_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "FantasyCalendar" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CalendarEvent_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CalendarEventCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CalendarEvent_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "CalendarEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Party_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignRoleCapabilityOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignRoleCapabilityOverride_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignMember" (
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "chronologyContributor" BOOLEAN NOT NULL DEFAULT false,
    "identityPageId" TEXT,
    "partyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "campaignId"),
    CONSTRAINT "CampaignMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignMember_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignMember_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CampaignMember_identityPageId_fkey" FOREIGN KEY ("identityPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WikiPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "workspace" TEXT,
    "pathKey" TEXT,
    "notebookArcId" TEXT,
    "title" TEXT NOT NULL,
    "parentId" TEXT,
    "featuredImageId" TEXT,
    "mapAssetId" TEXT,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "templateType" TEXT NOT NULL DEFAULT 'DEFAULT',
    "visibility" TEXT NOT NULL,
    "metadata" JSONB,
    "ownerType" TEXT NOT NULL DEFAULT 'STAFF',
    "ownerUserId" TEXT,
    "ownerPartyId" TEXT,
    "createdByUserId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WikiPage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WikiPage_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WikiPage_ownerPartyId_fkey" FOREIGN KEY ("ownerPartyId") REFERENCES "Party" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WikiPage_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WikiPage_notebookArcId_fkey" FOREIGN KEY ("notebookArcId") REFERENCES "NoteBookArc" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WikiPage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WikiPage_featuredImageId_fkey" FOREIGN KEY ("featuredImageId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WikiPage_mapAssetId_fkey" FOREIGN KEY ("mapAssetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NoteBookArc" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NoteBookArc_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignSessionTimeline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "wikiPageId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "sequenceOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignSessionTimeline_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignSessionTimeline_wikiPageId_fkey" FOREIGN KEY ("wikiPageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignSessionTimeline_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NarrativeStateSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "snapshotType" TEXT NOT NULL DEFAULT 'region',
    "payloadVersion" TEXT NOT NULL DEFAULT 'region-v1',
    "label" TEXT,
    "anchorLocationPageId" TEXT,
    "regionKey" TEXT,
    "capturedAtEpochMinute" BIGINT NOT NULL,
    "projectionContextHash" TEXT NOT NULL,
    "projectionSemanticsVersion" TEXT NOT NULL DEFAULT 'narrative-projection-v1',
    "payloadTier" TEXT NOT NULL DEFAULT 'hot',
    "dmPayload" JSONB NOT NULL,
    "partyPayload" JSONB NOT NULL,
    "compressionAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NarrativeStateSnapshot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NarrativeStateSnapshot_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartyRegionVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "locationPageId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "visitedAtEpochMinute" BIGINT NOT NULL,
    "sessionTimelinePointId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartyRegionVisit_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartyRegionVisit_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "NarrativeStateSnapshot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PartyRegionVisit_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartyVisitSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "locationPageId" TEXT NOT NULL,
    "sessionTimelinePointId" TEXT,
    "sourceLabel" TEXT,
    "dismissedAt" TIMESTAMP(3),
    "promotedVisitId" TEXT,
    "promotedSnapshotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartyVisitSuggestion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartyVisitSuggestion_promotedSnapshotId_fkey" FOREIGN KEY ("promotedSnapshotId") REFERENCES "NarrativeStateSnapshot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignSessionSchedule" (
    "timelinePointId" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "plannedStartAt" TIMESTAMP(3),
    "plannedEndAt" TIMESTAMP(3),
    "timezone" TEXT,
    "venueType" TEXT,
    "venueLabel" TEXT,
    "venueUrl" TEXT,
    "locationPageId" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignSessionSchedule_timelinePointId_fkey" FOREIGN KEY ("timelinePointId") REFERENCES "CampaignSessionTimeline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionAttendance" (
    "timelinePointId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("timelinePointId", "userId"),
    CONSTRAINT "SessionAttendance_timelinePointId_fkey" FOREIGN KEY ("timelinePointId") REFERENCES "CampaignSessionTimeline" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SessionAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignOwnershipTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CampaignOwnershipTransfer_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WikiLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "sourcePageId" TEXT NOT NULL,
    "targetPageId" TEXT NOT NULL,
    "aliasText" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WikiLink_sourcePageId_fkey" FOREIGN KEY ("sourcePageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WikiLink_targetPageId_fkey" FOREIGN KEY ("targetPageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EntityRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "sourceEntityType" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "targetEntityType" TEXT NOT NULL,
    "targetEntityId" TEXT NOT NULL,
    "relationKind" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'directed',
    "startDate" JSONB,
    "endDate" JSONB,
    "visibility" TEXT,
    "payload" JSONB,
    "sourceDomain" TEXT NOT NULL,
    "sourceRecordKey" TEXT NOT NULL,
    "sourcePageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EntityRelation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WikiPageAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WikiPageAlias_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EntityHistoricalAlias" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stableKey" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "context" TEXT,
    "usageType" TEXT NOT NULL DEFAULT 'OFFICIAL',
    "eraStart" JSONB,
    "eraEnd" JSONB,
    "regions" JSONB NOT NULL DEFAULT '[]',
    "visibility" TEXT NOT NULL DEFAULT 'GM_ONLY',
    "isPrimaryInEra" BOOLEAN NOT NULL DEFAULT false,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "playerDiscoverable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EntityHistoricalAlias_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoreInterpretationGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "topic" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoreInterpretationGroup_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoreInterpretationAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stableKey" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "interpretationGroupId" TEXT,
    "title" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "accountKind" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "beliefRegion" TEXT,
    "sourceOrigin" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "visibility" TEXT NOT NULL DEFAULT 'GM_ONLY',
    "narrativeWeight" TEXT,
    "gmResolution" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoreInterpretationAccount_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LoreInterpretationAccount_interpretationGroupId_fkey" FOREIGN KEY ("interpretationGroupId") REFERENCES "LoreInterpretationGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoreClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stableKey" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "interpretationGroupId" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "visibility" TEXT NOT NULL DEFAULT 'GM_ONLY',
    "narrativeWeight" TEXT,
    "gmResolution" TEXT,
    "knowledgeState" TEXT,
    "discoveredViaSessionId" TEXT,
    "discoveredViaType" TEXT,
    "discoveredViaRef" TEXT,
    "discoveredAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoreClaim_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LoreClaim_interpretationGroupId_fkey" FOREIGN KEY ("interpretationGroupId") REFERENCES "LoreInterpretationGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RumorCirculation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stableKey" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "edgeKind" TEXT NOT NULL DEFAULT 'circulation',
    "targetKind" TEXT NOT NULL,
    "targetRef" TEXT NOT NULL,
    "stance" TEXT NOT NULL,
    "awarenessScope" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'GM_ONLY',
    "spreadEventId" TEXT NOT NULL,
    "circulatedAtEpochMinute" BIGINT NOT NULL,
    "supersedesCirculationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RumorCirculation_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "LoreClaim" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RumorCirculation_spreadEventId_fkey" FOREIGN KEY ("spreadEventId") REFERENCES "CalendarEvent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RumorCirculation_supersedesCirculationId_fkey" FOREIGN KEY ("supersedesCirculationId") REFERENCES "RumorCirculation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoreClaimSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'SUPPORTS',
    "sourceType" TEXT NOT NULL DEFAULT 'OTHER',
    "sourceEntityType" TEXT,
    "sourceEntityId" TEXT,
    "label" TEXT,
    "note" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'GM_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoreClaimSource_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "LoreClaim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WikiPageStats" (
    "pageId" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "characterCount" INTEGER NOT NULL DEFAULT 0,
    "outboundLinkCount" INTEGER NOT NULL DEFAULT 0,
    "inboundLinkCount" INTEGER NOT NULL DEFAULT 0,
    "unresolvedWikilinkCount" INTEGER NOT NULL DEFAULT 0,
    "editCount" INTEGER NOT NULL DEFAULT 0,
    "firstCreatedAt" TIMESTAMP(3) NOT NULL,
    "lastEditedAt" TIMESTAMP(3) NOT NULL,
    "lastEditedByUserId" TEXT,
    "statsComputedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WikiPageStats_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NarrativeEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'user',
    "actorUserId" TEXT,
    "pageId" TEXT,
    "targetPageId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UnresolvedWikilink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "sourcePageId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "normalizedText" TEXT NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "ignoredByUserId" TEXT,
    "ignoredAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnresolvedWikilink_sourcePageId_fkey" FOREIGN KEY ("sourcePageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SocialMention" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "sourcePageId" TEXT NOT NULL,
    "mentionType" TEXT NOT NULL,
    "targetUserId" TEXT,
    "identityPageId" TEXT,
    "label" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialMention_sourcePageId_fkey" FOREIGN KEY ("sourcePageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "displayUrl" TEXT,
    "thumbnailUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "originalWidth" INTEGER,
    "originalHeight" INTEGER,
    "displayName" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'Public',
    "expiresAt" TIMESTAMP(3),
    "imageCredit" JSONB,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Asset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Asset_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MapPin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assetId" TEXT NOT NULL,
    "targetPageId" TEXT,
    "targetAssetId" TEXT,
    "label" TEXT,
    "pinType" TEXT NOT NULL DEFAULT 'Location',
    "x_coordinate" REAL NOT NULL,
    "y_coordinate" REAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MapPin_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MapPin_targetPageId_fkey" FOREIGN KEY ("targetPageId") REFERENCES "WikiPage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MapPin_targetAssetId_fkey" FOREIGN KEY ("targetAssetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MapLayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "mapAssetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MapLayer_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MapLayer_mapAssetId_fkey" FOREIGN KEY ("mapAssetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MapObjectGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "mapAssetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MapObjectGroup_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MapObjectGroup_mapAssetId_fkey" FOREIGN KEY ("mapAssetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MapSceneObject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "mapAssetId" TEXT NOT NULL,
    "layerId" TEXT,
    "groupId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'pin',
    "label" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'Public',
    "revelation" TEXT NOT NULL DEFAULT 'REVEALED',
    "geometry" JSONB NOT NULL,
    "style" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "mapPinId" TEXT,
    "targetPageId" TEXT,
    "targetAssetId" TEXT,
    "pinType" TEXT,
    "visibleFromEpochMinute" BIGINT,
    "visibleUntilEpochMinute" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MapSceneObject_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MapSceneObject_mapAssetId_fkey" FOREIGN KEY ("mapAssetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MapSceneObject_layerId_fkey" FOREIGN KEY ("layerId") REFERENCES "MapLayer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MapSceneObject_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MapObjectGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MapSceneObject_mapPinId_fkey" FOREIGN KEY ("mapPinId") REFERENCES "MapPin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MapObjectKeyframe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sceneObjectId" TEXT NOT NULL,
    "effectiveEpochMinute" BIGINT NOT NULL,
    "geometryOverride" JSONB,
    "styleOverride" JSONB,
    "visibilityOverride" TEXT,
    "revelationOverride" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MapObjectKeyframe_sceneObjectId_fkey" FOREIGN KEY ("sceneObjectId") REFERENCES "MapSceneObject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MapPresentationPreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "mapAssetId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "anchorEpochMinute" BIGINT NOT NULL,
    "enabledLayerIds" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MapPresentationPreset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MapPresentationPreset_mapAssetId_fkey" FOREIGN KEY ("mapAssetId") REFERENCES "Asset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentPresenceState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "subEntityId" TEXT,
    "state" TEXT NOT NULL,
    "workflowKey" TEXT,
    "reason" TEXT,
    "revealedByUserId" TEXT,
    "revealedAt" TIMESTAMP(3),
    "availableFromEpochMinute" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContentPresenceState_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContentPresenceState_revealedByUserId_fkey" FOREIGN KEY ("revealedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PageShortcut" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    CONSTRAINT "PageShortcut_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PageShortcut_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PageShortcut_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserCampaignPin" (
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "campaignId"),
    CONSTRAINT "UserCampaignPin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserCampaignPin_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserHubAttentionDismissal" (
    "userId" TEXT NOT NULL,
    "dismissKey" TEXT NOT NULL,
    "snoozeUntil" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "dismissKey"),
    CONSTRAINT "UserHubAttentionDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT,
    "name" TEXT NOT NULL,
    "defaultContent" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Template_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InstalledPlugin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "githubUrl" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backendEntry" TEXT NOT NULL,
    "frontendEntry" TEXT NOT NULL,
    "commitSha" TEXT NOT NULL DEFAULT '',
    "sourceRepo" TEXT NOT NULL DEFAULT '',
    "installPath" TEXT NOT NULL DEFAULT '',
    "manifestChecksum" TEXT NOT NULL DEFAULT '',
    "trustedInstall" BOOLEAN NOT NULL DEFAULT false,
    "installedByUserId" TEXT,
    "runtimeStatus" TEXT NOT NULL DEFAULT 'active',
    "quarantineReason" TEXT,
    "quarantinedAt" TIMESTAMP(3),
    "recentErrors" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "PlayerSandboxNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlayerSandboxNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerSandboxNote_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DashboardWidget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "widgetType" TEXT NOT NULL,
    "configJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DashboardWidget_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserNotificationPreference" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "channels" JSONB NOT NULL,
    "mutedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "linkUrl" TEXT,
    "campaignId" TEXT,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tag_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_TagToWikiPage" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_TagToWikiPage_A_fkey" FOREIGN KEY ("A") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_TagToWikiPage_B_fkey" FOREIGN KEY ("B") REFERENCES "WikiPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserTemplateResource_userId_kind_key" ON "UserTemplateResource"("userId", "kind");

-- CreateIndex
CREATE INDEX "ApiLog_userId_idx" ON "ApiLog"("userId");

-- CreateIndex
CREATE INDEX "ApiRequestLog_createdAt_idx" ON "ApiRequestLog"("createdAt");

-- CreateIndex
CREATE INDEX "ApiRequestLog_campaignId_createdAt_idx" ON "ApiRequestLog"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiRequestLog_userId_createdAt_idx" ON "ApiRequestLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiRequestLog_apiTokenId_createdAt_idx" ON "ApiRequestLog"("apiTokenId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiRequestLog_statusCode_createdAt_idx" ON "ApiRequestLog"("statusCode", "createdAt");

-- CreateIndex
CREATE INDEX "CampaignPluginSetting_campaignId_idx" ON "CampaignPluginSetting"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignPluginSetting_pluginId_idx" ON "CampaignPluginSetting"("pluginId");

-- CreateIndex
CREATE INDEX "CampaignJoinRequest_campaignId_idx" ON "CampaignJoinRequest"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignJoinRequest_userId_idx" ON "CampaignJoinRequest"("userId");

-- CreateIndex
CREATE INDEX "CampaignJoinRequest_campaignId_status_idx" ON "CampaignJoinRequest"("campaignId", "status");

-- CreateIndex
CREATE INDEX "UserToken_userId_idx" ON "UserToken"("userId");

-- CreateIndex
CREATE INDEX "UserToken_tokenHash_idx" ON "UserToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OidcAuthState_state_key" ON "OidcAuthState"("state");

-- CreateIndex
CREATE INDEX "OidcAuthState_expiresAt_idx" ON "OidcAuthState"("expiresAt");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "PluginData_campaignId_idx" ON "PluginData"("campaignId");

-- CreateIndex
CREATE INDEX "PluginData_pluginId_campaignId_idx" ON "PluginData"("pluginId", "campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "PluginData_pluginId_campaignId_key_key" ON "PluginData"("pluginId", "campaignId", "key");

-- CreateIndex
CREATE INDEX "PluginSecret_campaignId_idx" ON "PluginSecret"("campaignId");

-- CreateIndex
CREATE INDEX "PluginSecret_pluginId_campaignId_idx" ON "PluginSecret"("pluginId", "campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "PluginSecret_pluginId_campaignId_key_key" ON "PluginSecret"("pluginId", "campaignId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_handle_key" ON "Campaign"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_inviteToken_key" ON "Campaign"("inviteToken");

-- CreateIndex
CREATE INDEX "Campaign_archivedAt_idx" ON "Campaign"("archivedAt");

-- CreateIndex
CREATE INDEX "Campaign_campaignOwnerUserId_idx" ON "Campaign"("campaignOwnerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "DowntimeProject_wikiPageId_key" ON "DowntimeProject"("wikiPageId");

-- CreateIndex
CREATE INDEX "DowntimeProject_campaignId_status_idx" ON "DowntimeProject"("campaignId", "status");

-- CreateIndex
CREATE INDEX "DowntimeProject_campaignId_havenPageId_idx" ON "DowntimeProject"("campaignId", "havenPageId");

-- CreateIndex
CREATE INDEX "DowntimeProject_campaignId_priority_idx" ON "DowntimeProject"("campaignId", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "DowntimeHaven_wikiPageId_key" ON "DowntimeHaven"("wikiPageId");

-- CreateIndex
CREATE INDEX "DowntimeHaven_campaignId_status_idx" ON "DowntimeHaven"("campaignId", "status");

-- CreateIndex
CREATE INDEX "DowntimeHaven_campaignId_havenType_idx" ON "DowntimeHaven"("campaignId", "havenType");

-- CreateIndex
CREATE INDEX "DowntimeHaven_campaignId_ownershipType_idx" ON "DowntimeHaven"("campaignId", "ownershipType");

-- CreateIndex
CREATE INDEX "DowntimeHaven_campaignId_discoveryState_idx" ON "DowntimeHaven"("campaignId", "discoveryState");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignLedger_campaignId_key" ON "CampaignLedger"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignLedgerEntry_campaignId_occurredAtEpochMinute_idx" ON "CampaignLedgerEntry"("campaignId", "occurredAtEpochMinute");

-- CreateIndex
CREATE INDEX "CampaignLedgerEntry_ledgerId_occurredAtEpochMinute_idx" ON "CampaignLedgerEntry"("ledgerId", "occurredAtEpochMinute");

-- CreateIndex
CREATE INDEX "CampaignLedgerEntry_campaignId_entryKind_idx" ON "CampaignLedgerEntry"("campaignId", "entryKind");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignLedgerSuggestion_acceptedEntryId_key" ON "CampaignLedgerSuggestion"("acceptedEntryId");

-- CreateIndex
CREATE INDEX "CampaignLedgerSuggestion_campaignId_status_idx" ON "CampaignLedgerSuggestion"("campaignId", "status");

-- CreateIndex
CREATE INDEX "CampaignLedgerSuggestion_ledgerId_status_idx" ON "CampaignLedgerSuggestion"("ledgerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignLedgerSuggestion_campaignId_idempotencyKey_key" ON "CampaignLedgerSuggestion"("campaignId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "CampaignScheduledEffect_campaignId_status_nextFireEpochMinute_idx" ON "CampaignScheduledEffect"("campaignId", "status", "nextFireEpochMinute");

-- CreateIndex
CREATE INDEX "CampaignScheduledEffect_campaignId_effectKind_idx" ON "CampaignScheduledEffect"("campaignId", "effectKind");

-- CreateIndex
CREATE INDEX "CampaignScheduledEffectOccurrence_campaignId_scheduledEffectId_createdAt_idx" ON "CampaignScheduledEffectOccurrence"("campaignId", "scheduledEffectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignScheduledEffectOccurrence_campaignId_scheduledEffectId_fireAtEpochMinute_key" ON "CampaignScheduledEffectOccurrence"("campaignId", "scheduledEffectId", "fireAtEpochMinute");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignReputation_campaignId_key" ON "CampaignReputation"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignReputationEvent_campaignId_occurredAtEpochMinute_idx" ON "CampaignReputationEvent"("campaignId", "occurredAtEpochMinute");

-- CreateIndex
CREATE INDEX "CampaignReputationEvent_reputationId_occurredAtEpochMinute_idx" ON "CampaignReputationEvent"("reputationId", "occurredAtEpochMinute");

-- CreateIndex
CREATE INDEX "CampaignReputationEvent_campaignId_factionPageId_idx" ON "CampaignReputationEvent"("campaignId", "factionPageId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignReputationSuggestion_acceptedEventId_key" ON "CampaignReputationSuggestion"("acceptedEventId");

-- CreateIndex
CREATE INDEX "CampaignReputationSuggestion_campaignId_status_idx" ON "CampaignReputationSuggestion"("campaignId", "status");

-- CreateIndex
CREATE INDEX "CampaignReputationSuggestion_reputationId_status_idx" ON "CampaignReputationSuggestion"("reputationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignReputationSuggestion_campaignId_idempotencyKey_key" ON "CampaignReputationSuggestion"("campaignId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMomentum_campaignId_key" ON "CampaignMomentum"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignWorldEventSuggestion_acceptedCalendarEventId_key" ON "CampaignWorldEventSuggestion"("acceptedCalendarEventId");

-- CreateIndex
CREATE INDEX "CampaignWorldEventSuggestion_campaignId_status_idx" ON "CampaignWorldEventSuggestion"("campaignId", "status");

-- CreateIndex
CREATE INDEX "CampaignWorldEventSuggestion_campaignId_primaryOrgPageId_momentumState_idx" ON "CampaignWorldEventSuggestion"("campaignId", "primaryOrgPageId", "momentumState");

-- CreateIndex
CREATE INDEX "CampaignWorldEventSuggestion_campaignId_expiresAt_idx" ON "CampaignWorldEventSuggestion"("campaignId", "expiresAt");

-- CreateIndex
CREATE INDEX "CampaignWorldEventSuggestion_parentSuggestionId_idx" ON "CampaignWorldEventSuggestion"("parentSuggestionId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignWorldEventSuggestion_campaignId_idempotencyKey_key" ON "CampaignWorldEventSuggestion"("campaignId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "NarrativeLifecycleState_campaignId_subjectKind_lifecycleState_idx" ON "NarrativeLifecycleState"("campaignId", "subjectKind", "lifecycleState");

-- CreateIndex
CREATE UNIQUE INDEX "NarrativeLifecycleState_campaignId_subjectKind_subjectId_key" ON "NarrativeLifecycleState"("campaignId", "subjectKind", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "PageNarrativeStatus_wikiPageId_key" ON "PageNarrativeStatus"("wikiPageId");

-- CreateIndex
CREATE INDEX "PageNarrativeStatus_campaignId_status_idx" ON "PageNarrativeStatus"("campaignId", "status");

-- CreateIndex
CREATE INDEX "NarrativeBranchState_campaignId_idx" ON "NarrativeBranchState"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "NarrativeBranchState_campaignId_subjectId_key" ON "NarrativeBranchState"("campaignId", "subjectId");

-- CreateIndex
CREATE INDEX "NarrativeConsequenceReceipt_campaignId_subjectId_idx" ON "NarrativeConsequenceReceipt"("campaignId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "NarrativeConsequenceReceipt_campaignId_idempotencyKey_key" ON "NarrativeConsequenceReceipt"("campaignId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "TimeAdvanceSimulationRun_campaignId_createdAt_idx" ON "TimeAdvanceSimulationRun"("campaignId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TimeAdvanceSimulationRun_campaignId_source_sourceRef_nextEpochMinute_key" ON "TimeAdvanceSimulationRun"("campaignId", "source", "sourceRef", "nextEpochMinute");

-- CreateIndex
CREATE INDEX "WorldAdvanceReceipt_campaignId_batchId_idx" ON "WorldAdvanceReceipt"("campaignId", "batchId");

-- CreateIndex
CREATE INDEX "WorldAdvanceReceipt_campaignId_chronologyEventId_idx" ON "WorldAdvanceReceipt"("campaignId", "chronologyEventId");

-- CreateIndex
CREATE UNIQUE INDEX "WorldAdvanceReceipt_campaignId_idempotencyKey_key" ON "WorldAdvanceReceipt"("campaignId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "CampaignActivity_campaignId_idx" ON "CampaignActivity"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignActivity_campaignId_createdAt_idx" ON "CampaignActivity"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "CampaignActivity_campaignId_entityType_entityId_idx" ON "CampaignActivity"("campaignId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "FantasyCalendar_campaignId_idx" ON "FantasyCalendar"("campaignId");

-- CreateIndex
CREATE INDEX "CalendarEventCategory_campaignId_idx" ON "CalendarEventCategory"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEventCategory_campaignId_name_key" ON "CalendarEventCategory"("campaignId", "name");

-- CreateIndex
CREATE INDEX "CalendarEvent_calendarId_idx" ON "CalendarEvent"("calendarId");

-- CreateIndex
CREATE INDEX "CalendarEvent_categoryId_idx" ON "CalendarEvent"("categoryId");

-- CreateIndex
CREATE INDEX "CalendarEvent_prerequisiteId_idx" ON "CalendarEvent"("prerequisiteId");

-- CreateIndex
CREATE INDEX "CalendarEvent_visibility_idx" ON "CalendarEvent"("visibility");

-- CreateIndex
CREATE INDEX "CalendarEvent_isRepeating_idx" ON "CalendarEvent"("isRepeating");

-- CreateIndex
CREATE INDEX "CalendarEvent_repeatUnit_idx" ON "CalendarEvent"("repeatUnit");

-- CreateIndex
CREATE INDEX "CalendarEvent_calendarId_categoryId_idx" ON "CalendarEvent"("calendarId", "categoryId");

-- CreateIndex
CREATE INDEX "CalendarEvent_targetEpochMinute_idx" ON "CalendarEvent"("targetEpochMinute");

-- CreateIndex
CREATE INDEX "CalendarEvent_targetYear_targetMonth_targetDay_idx" ON "CalendarEvent"("targetYear", "targetMonth", "targetDay");

-- CreateIndex
CREATE INDEX "Party_campaignId_idx" ON "Party"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignRoleCapabilityOverride_campaignId_role_idx" ON "CampaignRoleCapabilityOverride"("campaignId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRoleCapabilityOverride_campaignId_role_capability_key" ON "CampaignRoleCapabilityOverride"("campaignId", "role", "capability");

-- CreateIndex
CREATE INDEX "CampaignMember_campaignId_idx" ON "CampaignMember"("campaignId");

-- CreateIndex
CREATE INDEX "CampaignMember_identityPageId_idx" ON "CampaignMember"("identityPageId");

-- CreateIndex
CREATE INDEX "CampaignMember_partyId_idx" ON "CampaignMember"("partyId");

-- CreateIndex
CREATE INDEX "WikiPage_campaignId_idx" ON "WikiPage"("campaignId");

-- CreateIndex
CREATE INDEX "WikiPage_campaignId_workspace_idx" ON "WikiPage"("campaignId", "workspace");

-- CreateIndex
CREATE INDEX "WikiPage_parentId_idx" ON "WikiPage"("parentId");

-- CreateIndex
CREATE INDEX "WikiPage_notebookArcId_idx" ON "WikiPage"("notebookArcId");

-- CreateIndex
CREATE INDEX "WikiPage_mapAssetId_idx" ON "WikiPage"("mapAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "WikiPage_campaignId_workspace_pathKey_key" ON "WikiPage"("campaignId", "workspace", "pathKey");

-- CreateIndex
CREATE INDEX "NoteBookArc_campaignId_displayOrder_idx" ON "NoteBookArc"("campaignId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignSessionTimeline_wikiPageId_key" ON "CampaignSessionTimeline"("wikiPageId");

-- CreateIndex
CREATE INDEX "CampaignSessionTimeline_campaignId_sequenceOrder_idx" ON "CampaignSessionTimeline"("campaignId", "sequenceOrder");

-- CreateIndex
CREATE INDEX "CampaignSessionTimeline_authorId_idx" ON "CampaignSessionTimeline"("authorId");

-- CreateIndex
CREATE INDEX "NarrativeStateSnapshot_campaignId_idx" ON "NarrativeStateSnapshot"("campaignId");

-- CreateIndex
CREATE INDEX "NarrativeStateSnapshot_campaignId_regionKey_idx" ON "NarrativeStateSnapshot"("campaignId", "regionKey");

-- CreateIndex
CREATE INDEX "NarrativeStateSnapshot_campaignId_anchorLocationPageId_idx" ON "NarrativeStateSnapshot"("campaignId", "anchorLocationPageId");

-- CreateIndex
CREATE INDEX "NarrativeStateSnapshot_campaignId_kind_payloadTier_idx" ON "NarrativeStateSnapshot"("campaignId", "kind", "payloadTier");

-- CreateIndex
CREATE INDEX "PartyRegionVisit_campaignId_locationPageId_visitedAtEpochMinute_idx" ON "PartyRegionVisit"("campaignId", "locationPageId", "visitedAtEpochMinute");

-- CreateIndex
CREATE INDEX "PartyRegionVisit_snapshotId_idx" ON "PartyRegionVisit"("snapshotId");

-- CreateIndex
CREATE INDEX "PartyVisitSuggestion_campaignId_locationPageId_idx" ON "PartyVisitSuggestion"("campaignId", "locationPageId");

-- CreateIndex
CREATE INDEX "PartyVisitSuggestion_campaignId_locationPageId_dismissedAt_idx" ON "PartyVisitSuggestion"("campaignId", "locationPageId", "dismissedAt");

-- CreateIndex
CREATE INDEX "CampaignSessionSchedule_status_plannedStartAt_idx" ON "CampaignSessionSchedule"("status", "plannedStartAt");

-- CreateIndex
CREATE INDEX "CampaignSessionSchedule_plannedStartAt_reminderSentAt_idx" ON "CampaignSessionSchedule"("plannedStartAt", "reminderSentAt");

-- CreateIndex
CREATE INDEX "SessionAttendance_timelinePointId_idx" ON "SessionAttendance"("timelinePointId");

-- CreateIndex
CREATE INDEX "SessionAttendance_userId_idx" ON "SessionAttendance"("userId");

-- CreateIndex
CREATE INDEX "CampaignOwnershipTransfer_campaignId_status_idx" ON "CampaignOwnershipTransfer"("campaignId", "status");

-- CreateIndex
CREATE INDEX "CampaignOwnershipTransfer_toUserId_status_idx" ON "CampaignOwnershipTransfer"("toUserId", "status");

-- CreateIndex
CREATE INDEX "WikiLink_targetPageId_idx" ON "WikiLink"("targetPageId");

-- CreateIndex
CREATE INDEX "WikiLink_campaignId_targetPageId_idx" ON "WikiLink"("campaignId", "targetPageId");

-- CreateIndex
CREATE UNIQUE INDEX "WikiLink_sourcePageId_targetPageId_key" ON "WikiLink"("sourcePageId", "targetPageId");

-- CreateIndex
CREATE INDEX "EntityRelation_campaignId_sourceEntityType_sourceEntityId_idx" ON "EntityRelation"("campaignId", "sourceEntityType", "sourceEntityId");

-- CreateIndex
CREATE INDEX "EntityRelation_campaignId_targetEntityType_targetEntityId_idx" ON "EntityRelation"("campaignId", "targetEntityType", "targetEntityId");

-- CreateIndex
CREATE INDEX "EntityRelation_campaignId_relationKind_idx" ON "EntityRelation"("campaignId", "relationKind");

-- CreateIndex
CREATE INDEX "EntityRelation_campaignId_sourcePageId_idx" ON "EntityRelation"("campaignId", "sourcePageId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityRelation_campaignId_sourceDomain_sourceRecordKey_key" ON "EntityRelation"("campaignId", "sourceDomain", "sourceRecordKey");

-- CreateIndex
CREATE INDEX "WikiPageAlias_pageId_idx" ON "WikiPageAlias"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "WikiPageAlias_campaignId_normalizedAlias_key" ON "WikiPageAlias"("campaignId", "normalizedAlias");

-- CreateIndex
CREATE UNIQUE INDEX "EntityHistoricalAlias_stableKey_key" ON "EntityHistoricalAlias"("stableKey");

-- CreateIndex
CREATE INDEX "EntityHistoricalAlias_pageId_idx" ON "EntityHistoricalAlias"("pageId");

-- CreateIndex
CREATE INDEX "EntityHistoricalAlias_campaignId_pageId_idx" ON "EntityHistoricalAlias"("campaignId", "pageId");

-- CreateIndex
CREATE INDEX "LoreInterpretationGroup_pageId_idx" ON "LoreInterpretationGroup"("pageId");

-- CreateIndex
CREATE INDEX "LoreInterpretationGroup_campaignId_pageId_idx" ON "LoreInterpretationGroup"("campaignId", "pageId");

-- CreateIndex
CREATE UNIQUE INDEX "LoreInterpretationAccount_stableKey_key" ON "LoreInterpretationAccount"("stableKey");

-- CreateIndex
CREATE INDEX "LoreInterpretationAccount_pageId_idx" ON "LoreInterpretationAccount"("pageId");

-- CreateIndex
CREATE INDEX "LoreInterpretationAccount_interpretationGroupId_idx" ON "LoreInterpretationAccount"("interpretationGroupId");

-- CreateIndex
CREATE INDEX "LoreInterpretationAccount_campaignId_pageId_idx" ON "LoreInterpretationAccount"("campaignId", "pageId");

-- CreateIndex
CREATE UNIQUE INDEX "LoreClaim_stableKey_key" ON "LoreClaim"("stableKey");

-- CreateIndex
CREATE INDEX "LoreClaim_pageId_idx" ON "LoreClaim"("pageId");

-- CreateIndex
CREATE INDEX "LoreClaim_interpretationGroupId_idx" ON "LoreClaim"("interpretationGroupId");

-- CreateIndex
CREATE INDEX "LoreClaim_campaignId_pageId_idx" ON "LoreClaim"("campaignId", "pageId");

-- CreateIndex
CREATE UNIQUE INDEX "RumorCirculation_stableKey_key" ON "RumorCirculation"("stableKey");

-- CreateIndex
CREATE INDEX "RumorCirculation_campaignId_targetKind_targetRef_circulatedAtEpochMinute_idx" ON "RumorCirculation"("campaignId", "targetKind", "targetRef", "circulatedAtEpochMinute");

-- CreateIndex
CREATE INDEX "RumorCirculation_campaignId_targetKind_targetRef_visibility_idx" ON "RumorCirculation"("campaignId", "targetKind", "targetRef", "visibility");

-- CreateIndex
CREATE INDEX "RumorCirculation_campaignId_claimId_circulatedAtEpochMinute_idx" ON "RumorCirculation"("campaignId", "claimId", "circulatedAtEpochMinute");

-- CreateIndex
CREATE INDEX "RumorCirculation_spreadEventId_idx" ON "RumorCirculation"("spreadEventId");

-- CreateIndex
CREATE INDEX "RumorCirculation_supersedesCirculationId_idx" ON "RumorCirculation"("supersedesCirculationId");

-- CreateIndex
CREATE INDEX "LoreClaimSource_claimId_idx" ON "LoreClaimSource"("claimId");

-- CreateIndex
CREATE INDEX "WikiPageStats_campaignId_idx" ON "WikiPageStats"("campaignId");

-- CreateIndex
CREATE INDEX "NarrativeEvent_campaignId_createdAt_idx" ON "NarrativeEvent"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "NarrativeEvent_campaignId_type_createdAt_idx" ON "NarrativeEvent"("campaignId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "NarrativeEvent_campaignId_source_createdAt_idx" ON "NarrativeEvent"("campaignId", "source", "createdAt");

-- CreateIndex
CREATE INDEX "UnresolvedWikilink_campaignId_normalizedText_idx" ON "UnresolvedWikilink"("campaignId", "normalizedText");

-- CreateIndex
CREATE INDEX "UnresolvedWikilink_campaignId_status_idx" ON "UnresolvedWikilink"("campaignId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UnresolvedWikilink_campaignId_sourcePageId_normalizedText_key" ON "UnresolvedWikilink"("campaignId", "sourcePageId", "normalizedText");

-- CreateIndex
CREATE INDEX "SocialMention_campaignId_targetUserId_idx" ON "SocialMention"("campaignId", "targetUserId");

-- CreateIndex
CREATE INDEX "SocialMention_sourcePageId_idx" ON "SocialMention"("sourcePageId");

-- CreateIndex
CREATE INDEX "Asset_campaignId_idx" ON "Asset"("campaignId");

-- CreateIndex
CREATE INDEX "MapPin_assetId_idx" ON "MapPin"("assetId");

-- CreateIndex
CREATE INDEX "MapPin_targetPageId_idx" ON "MapPin"("targetPageId");

-- CreateIndex
CREATE INDEX "MapPin_targetAssetId_idx" ON "MapPin"("targetAssetId");

-- CreateIndex
CREATE INDEX "MapLayer_mapAssetId_idx" ON "MapLayer"("mapAssetId");

-- CreateIndex
CREATE INDEX "MapLayer_campaignId_idx" ON "MapLayer"("campaignId");

-- CreateIndex
CREATE INDEX "MapObjectGroup_mapAssetId_idx" ON "MapObjectGroup"("mapAssetId");

-- CreateIndex
CREATE INDEX "MapObjectGroup_campaignId_idx" ON "MapObjectGroup"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "MapSceneObject_mapPinId_key" ON "MapSceneObject"("mapPinId");

-- CreateIndex
CREATE INDEX "MapSceneObject_mapAssetId_idx" ON "MapSceneObject"("mapAssetId");

-- CreateIndex
CREATE INDEX "MapSceneObject_campaignId_idx" ON "MapSceneObject"("campaignId");

-- CreateIndex
CREATE INDEX "MapSceneObject_layerId_idx" ON "MapSceneObject"("layerId");

-- CreateIndex
CREATE INDEX "MapSceneObject_groupId_idx" ON "MapSceneObject"("groupId");

-- CreateIndex
CREATE INDEX "MapSceneObject_targetPageId_idx" ON "MapSceneObject"("targetPageId");

-- CreateIndex
CREATE INDEX "MapSceneObject_targetAssetId_idx" ON "MapSceneObject"("targetAssetId");

-- CreateIndex
CREATE INDEX "MapSceneObject_visibleFromEpochMinute_idx" ON "MapSceneObject"("visibleFromEpochMinute");

-- CreateIndex
CREATE INDEX "MapSceneObject_visibleUntilEpochMinute_idx" ON "MapSceneObject"("visibleUntilEpochMinute");

-- CreateIndex
CREATE INDEX "MapObjectKeyframe_sceneObjectId_effectiveEpochMinute_idx" ON "MapObjectKeyframe"("sceneObjectId", "effectiveEpochMinute");

-- CreateIndex
CREATE INDEX "MapPresentationPreset_mapAssetId_idx" ON "MapPresentationPreset"("mapAssetId");

-- CreateIndex
CREATE INDEX "MapPresentationPreset_campaignId_idx" ON "MapPresentationPreset"("campaignId");

-- CreateIndex
CREATE INDEX "ContentPresenceState_campaignId_entityType_state_idx" ON "ContentPresenceState"("campaignId", "entityType", "state");

-- CreateIndex
CREATE INDEX "ContentPresenceState_campaignId_workflowKey_idx" ON "ContentPresenceState"("campaignId", "workflowKey");

-- CreateIndex
CREATE INDEX "ContentPresenceState_campaignId_entityType_entityId_idx" ON "ContentPresenceState"("campaignId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "ContentPresenceState_campaignId_updatedAt_idx" ON "ContentPresenceState"("campaignId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPresenceState_campaignId_entityType_entityId_subEntityId_key" ON "ContentPresenceState"("campaignId", "entityType", "entityId", "subEntityId");

-- CreateIndex
CREATE INDEX "PageShortcut_userId_campaignId_idx" ON "PageShortcut"("userId", "campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "PageShortcut_userId_campaignId_pageId_key" ON "PageShortcut"("userId", "campaignId", "pageId");

-- CreateIndex
CREATE INDEX "UserCampaignPin_userId_sortOrder_idx" ON "UserCampaignPin"("userId", "sortOrder");

-- CreateIndex
CREATE INDEX "Template_campaignId_idx" ON "Template"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "InstalledPlugin_name_key" ON "InstalledPlugin"("name");

-- CreateIndex
CREATE INDEX "PlayerSandboxNote_userId_campaignId_idx" ON "PlayerSandboxNote"("userId", "campaignId");

-- CreateIndex
CREATE INDEX "DashboardWidget_campaignId_idx" ON "DashboardWidget"("campaignId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_campaignId_idx" ON "Notification"("campaignId");

-- CreateIndex
CREATE INDEX "Tag_campaignId_idx" ON "Tag"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_campaignId_name_key" ON "Tag"("campaignId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "_TagToWikiPage_AB_unique" ON "_TagToWikiPage"("A", "B");

-- CreateIndex
CREATE INDEX "_TagToWikiPage_B_index" ON "_TagToWikiPage"("B");

