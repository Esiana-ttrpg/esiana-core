-- Federated identity: IdentityProvider, OidcAuthState, Account group snapshot

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "OidcAuthState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "state" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "userId" TEXT,
    "codeVerifier" TEXT NOT NULL,
    "returnTo" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "OidcAuthState_state_key" ON "OidcAuthState"("state");
CREATE INDEX "OidcAuthState_expiresAt_idx" ON "OidcAuthState"("expiresAt");

CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "idpGroups" JSONB,
    "groupsSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "new_Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Account" ("id", "userId", "provider", "providerAccountId", "accessToken", "refreshToken", "expiresAt", "createdAt", "updatedAt")
SELECT "id", "userId", "provider", "providerAccountId", "accessToken", "refreshToken", "expiresAt", "createdAt", "updatedAt" FROM "Account";

DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
