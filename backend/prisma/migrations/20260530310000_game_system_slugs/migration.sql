-- GameSystem enum values become string slugs; add optional custom name for "other".

ALTER TABLE "Campaign" ADD COLUMN "customGameSystemName" TEXT;

UPDATE "Campaign" SET "gameSystem" = 'dnd-5e' WHERE "gameSystem" = 'DND';
UPDATE "Campaign" SET "gameSystem" = 'pathfinder-2e' WHERE "gameSystem" = 'PATHFINDER';
UPDATE "Campaign" SET "gameSystem" = 'daggerheart' WHERE "gameSystem" = 'DAGGERHEART';
UPDATE "Campaign" SET "gameSystem" = 'other' WHERE "gameSystem" = 'OTHER';
