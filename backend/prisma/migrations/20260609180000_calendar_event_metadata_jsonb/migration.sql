-- Repair CalendarEvent.metadata column affinity for SQLite + Prisma
-- (20260608160000 used JSON; Prisma SQLite connector expects JSONB)

ALTER TABLE "CalendarEvent" DROP COLUMN "metadata";
ALTER TABLE "CalendarEvent" ADD COLUMN "metadata" JSONB;
