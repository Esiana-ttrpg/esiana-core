-- SQLite + Prisma: JSON affinity breaks reads/writes; use JSONB (see 20260601130000_fix_user_defaults_json_sqlite)

ALTER TABLE "NarrativeEvent" DROP COLUMN "metadata";
ALTER TABLE "NarrativeEvent" ADD COLUMN "metadata" JSONB;
