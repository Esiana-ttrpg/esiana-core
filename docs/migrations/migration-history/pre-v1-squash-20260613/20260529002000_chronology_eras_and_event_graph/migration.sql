-- Create era columns for chronology timeline matrix
CREATE TABLE "TimelineEra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimelineEra_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TimelineEra_campaignId_idx" ON "TimelineEra"("campaignId");
CREATE INDEX "TimelineEra_campaignId_order_idx" ON "TimelineEra"("campaignId", "order");
CREATE UNIQUE INDEX "TimelineEra_campaignId_order_key" ON "TimelineEra"("campaignId", "order");

-- Rebuild CalendarEvent to add chronology graph fields and relations.
CREATE TABLE "CalendarEvent_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "calendarId" TEXT NOT NULL,
    "eraId" TEXT,
    "prerequisiteId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'PARTY',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "targetYear" INTEGER,
    "targetMonth" INTEGER,
    "targetDay" INTEGER,
    "targetEpochMinute" BIGINT,
    "recurrenceRule" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CalendarEvent_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "FantasyCalendar" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CalendarEvent_eraId_fkey" FOREIGN KEY ("eraId") REFERENCES "TimelineEra" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CalendarEvent_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "CalendarEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "CalendarEvent_new" (
    "id",
    "calendarId",
    "title",
    "description",
    "isRecurring",
    "targetYear",
    "targetMonth",
    "targetDay",
    "targetEpochMinute",
    "recurrenceRule",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "calendarId",
    "title",
    "description",
    "isRecurring",
    "targetYear",
    "targetMonth",
    "targetDay",
    "targetEpochMinute",
    "recurrenceRule",
    "createdAt",
    "updatedAt"
FROM "CalendarEvent";

DROP TABLE "CalendarEvent";
ALTER TABLE "CalendarEvent_new" RENAME TO "CalendarEvent";

CREATE INDEX "CalendarEvent_calendarId_idx" ON "CalendarEvent"("calendarId");
CREATE INDEX "CalendarEvent_eraId_idx" ON "CalendarEvent"("eraId");
CREATE INDEX "CalendarEvent_prerequisiteId_idx" ON "CalendarEvent"("prerequisiteId");
CREATE INDEX "CalendarEvent_visibility_idx" ON "CalendarEvent"("visibility");
CREATE INDEX "CalendarEvent_calendarId_eraId_idx" ON "CalendarEvent"("calendarId", "eraId");
CREATE INDEX "CalendarEvent_targetEpochMinute_idx" ON "CalendarEvent"("targetEpochMinute");
CREATE INDEX "CalendarEvent_targetYear_targetMonth_targetDay_idx" ON "CalendarEvent"("targetYear", "targetMonth", "targetDay");
