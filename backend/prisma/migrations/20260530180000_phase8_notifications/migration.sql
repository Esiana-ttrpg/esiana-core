-- Phase 8: Notifications, session scheduling, RSVP, ownership transfer

-- AlterTable SystemSetting
ALTER TABLE "SystemSetting" ADD COLUMN "notificationPollIntervalSeconds" INTEGER NOT NULL DEFAULT 60;

-- CreateTable UserNotificationPreference
CREATE TABLE "UserNotificationPreference" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "channels" JSONB NOT NULL,
    "mutedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Recreate Notification with extended fields (table may not exist in all deployments)
CREATE TABLE "Notification_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GENERIC',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "linkUrl" TEXT,
    "campaignId" TEXT,
    "metadata" JSONB,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Notification_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Migrate existing Notification rows if table exists
INSERT INTO "Notification_new" ("id", "userId", "type", "title", "body", "isRead", "readAt", "linkUrl", "createdAt", "updatedAt")
SELECT "id", "userId", 'GENERIC', "title", "body", "isRead",
       CASE WHEN "isRead" = 1 THEN "updatedAt" ELSE NULL END,
       "linkUrl", "createdAt", "updatedAt"
FROM "Notification"
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='Notification');

DROP TABLE IF EXISTS "Notification";
ALTER TABLE "Notification_new" RENAME TO "Notification";

CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_campaignId_idx" ON "Notification"("campaignId");

-- CreateTable CampaignSessionSchedule
CREATE TABLE "CampaignSessionSchedule" (
    "timelinePointId" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "plannedStartAt" DATETIME,
    "plannedEndAt" DATETIME,
    "timezone" TEXT,
    "venueType" TEXT,
    "venueLabel" TEXT,
    "venueUrl" TEXT,
    "locationPageId" TEXT,
    "reminderSentAt" DATETIME,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignSessionSchedule_timelinePointId_fkey" FOREIGN KEY ("timelinePointId") REFERENCES "CampaignSessionTimeline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CampaignSessionSchedule_status_plannedStartAt_idx" ON "CampaignSessionSchedule"("status", "plannedStartAt");
CREATE INDEX "CampaignSessionSchedule_plannedStartAt_reminderSentAt_idx" ON "CampaignSessionSchedule"("plannedStartAt", "reminderSentAt");

-- CreateTable SessionAttendance
CREATE TABLE "SessionAttendance" (
    "timelinePointId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "updatedAt" DATETIME NOT NULL,
    PRIMARY KEY ("timelinePointId", "userId"),
    CONSTRAINT "SessionAttendance_timelinePointId_fkey" FOREIGN KEY ("timelinePointId") REFERENCES "CampaignSessionTimeline" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SessionAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SessionAttendance_timelinePointId_idx" ON "SessionAttendance"("timelinePointId");
CREATE INDEX "SessionAttendance_userId_idx" ON "SessionAttendance"("userId");

-- CreateTable CampaignOwnershipTransfer
CREATE TABLE "CampaignOwnershipTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignOwnershipTransfer_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CampaignOwnershipTransfer_campaignId_status_idx" ON "CampaignOwnershipTransfer"("campaignId", "status");
CREATE INDEX "CampaignOwnershipTransfer_toUserId_status_idx" ON "CampaignOwnershipTransfer"("toUserId", "status");
