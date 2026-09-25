CREATE TABLE "PluginOAuthClient" (
    "pluginId" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "clientSecretEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PluginOAuthClient_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "SystemPlugin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PluginConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pluginId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "authType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "credentialEnc" TEXT,
    "credentialVersion" INTEGER NOT NULL DEFAULT 0,
    "accountLabel" TEXT,
    "scopes" JSONB,
    "expiresAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PluginConnection_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PluginConnectionAuthState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stateHash" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "connectionId" TEXT,
    "connectionVersion" INTEGER,
    "codeVerifier" TEXT NOT NULL,
    "returnTo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PluginConnectionAuthState_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PluginConnection_pluginId_campaignId_ownerType_ownerId_key" ON "PluginConnection"("pluginId", "campaignId", "ownerType", "ownerId");
CREATE INDEX "PluginConnection_campaignId_idx" ON "PluginConnection"("campaignId");
CREATE INDEX "PluginConnection_pluginId_campaignId_idx" ON "PluginConnection"("pluginId", "campaignId");
CREATE INDEX "PluginConnection_ownerType_ownerId_idx" ON "PluginConnection"("ownerType", "ownerId");
CREATE UNIQUE INDEX "PluginConnectionAuthState_stateHash_key" ON "PluginConnectionAuthState"("stateHash");
CREATE INDEX "PluginConnectionAuthState_campaignId_idx" ON "PluginConnectionAuthState"("campaignId");
CREATE INDEX "PluginConnectionAuthState_expiresAt_idx" ON "PluginConnectionAuthState"("expiresAt");
