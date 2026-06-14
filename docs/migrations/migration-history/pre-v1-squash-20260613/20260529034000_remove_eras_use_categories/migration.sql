-- Remove TimelineEra table and eraId references from CalendarEvent
CREATE TABLE "CalendarEvent_new" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CalendarEvent_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "FantasyCalendar" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CalendarEvent_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CalendarEventCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CalendarEvent_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "CalendarEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "CalendarEvent_new" (
    "id","calendarId","categoryId","prerequisiteId","visibility","title","description",
    "duration","isRepeating","repeatInterval","repeatUnit","limitRepetitions",
    "conditions","moonOverrides","isRecurring","targetYear","targetMonth","targetDay",
    "targetEpochMinute","recurrenceRule","createdAt","updatedAt"
)
SELECT
    "id","calendarId","categoryId","prerequisiteId","visibility","title","description",
    "duration","isRepeating","repeatInterval","repeatUnit","limitRepetitions",
    "conditions","moonOverrides","isRecurring","targetYear","targetMonth","targetDay",
    "targetEpochMinute","recurrenceRule","createdAt","updatedAt"
FROM "CalendarEvent";

DROP TABLE "CalendarEvent";
ALTER TABLE "CalendarEvent_new" RENAME TO "CalendarEvent";

DROP TABLE IF EXISTS "TimelineEra";

CREATE INDEX "CalendarEvent_calendarId_idx" ON "CalendarEvent"("calendarId");
CREATE INDEX "CalendarEvent_categoryId_idx" ON "CalendarEvent"("categoryId");
CREATE INDEX "CalendarEvent_prerequisiteId_idx" ON "CalendarEvent"("prerequisiteId");
CREATE INDEX "CalendarEvent_visibility_idx" ON "CalendarEvent"("visibility");
CREATE INDEX "CalendarEvent_isRepeating_idx" ON "CalendarEvent"("isRepeating");
CREATE INDEX "CalendarEvent_repeatUnit_idx" ON "CalendarEvent"("repeatUnit");
CREATE INDEX "CalendarEvent_calendarId_categoryId_idx" ON "CalendarEvent"("calendarId", "categoryId");
CREATE INDEX "CalendarEvent_targetEpochMinute_idx" ON "CalendarEvent"("targetEpochMinute");
CREATE INDEX "CalendarEvent_targetYear_targetMonth_targetDay_idx" ON "CalendarEvent"("targetYear", "targetMonth", "targetDay");
