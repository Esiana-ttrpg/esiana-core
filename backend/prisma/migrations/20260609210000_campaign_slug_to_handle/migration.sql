-- Rename Campaign.slug to handle (URL-safe unique campaign identifier)
ALTER TABLE "Campaign" RENAME COLUMN "slug" TO "handle";
