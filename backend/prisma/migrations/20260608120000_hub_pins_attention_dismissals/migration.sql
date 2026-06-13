-- CreateTable
CREATE TABLE "UserCampaignPin" (
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "campaignId"),
    CONSTRAINT "UserCampaignPin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserCampaignPin_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserHubAttentionDismissal" (
    "userId" TEXT NOT NULL,
    "dismissKey" TEXT NOT NULL,
    "snoozeUntil" DATETIME,
    "dismissedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "dismissKey"),
    CONSTRAINT "UserHubAttentionDismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UserCampaignPin_userId_sortOrder_idx" ON "UserCampaignPin"("userId", "sortOrder");
