-- User campaign defaults and template resources (Phase 2 settings)

ALTER TABLE "User" ADD COLUMN "gmStyleTags" JSONB;

CREATE TABLE "UserCampaignDefaults" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "prefs" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserCampaignDefaults_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "UserTemplateResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "markdown" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserTemplateResource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserTemplateResource_userId_kind_key" ON "UserTemplateResource"("userId", "kind");
