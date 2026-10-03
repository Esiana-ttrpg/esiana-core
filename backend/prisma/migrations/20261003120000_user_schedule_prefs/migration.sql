-- User-level vacation + Auto RSVP preferences for the Schedule page.

ALTER TABLE "User" ADD COLUMN "vacationStartDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "vacationEndDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "autoRsvpEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "autoRsvpDaysBefore" INTEGER;
