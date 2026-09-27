CREATE TABLE "PluginOAuthClient" (
    "pluginId" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "clientSecretEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PluginOAuthClient_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "SystemPlugin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PluginConnection" (
    "pluginId" TEXT NOT NULL PRIMARY KEY,
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
    CONSTRAINT "PluginConnection_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "SystemPlugin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PluginConnectionAuthState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stateHash" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "connectionVersion" INTEGER,
    "codeVerifier" TEXT NOT NULL,
    "returnTo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PluginConnectionAuthState_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "SystemPlugin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PluginConnectionAuthState_stateHash_key" ON "PluginConnectionAuthState"("stateHash");
CREATE INDEX "PluginConnectionAuthState_pluginId_idx" ON "PluginConnectionAuthState"("pluginId");
CREATE INDEX "PluginConnectionAuthState_expiresAt_idx" ON "PluginConnectionAuthState"("expiresAt");
