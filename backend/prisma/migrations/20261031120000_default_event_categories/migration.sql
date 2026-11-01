ALTER TABLE "Campaign" ADD COLUMN "eventCategoriesInitialized" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CalendarEventCategory" ADD COLUMN "icon" TEXT;
ALTER TABLE "CalendarEventCategory" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
