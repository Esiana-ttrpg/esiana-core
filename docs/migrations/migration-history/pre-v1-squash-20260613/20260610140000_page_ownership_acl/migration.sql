-- Page ownership + Party model + capability overrides (ACL Phase B0/D)

CREATE TABLE "Party" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Party_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Party_campaignId_idx" ON "Party"("campaignId");

CREATE TABLE "CampaignRoleCapabilityOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CampaignRoleCapabilityOverride_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CampaignRoleCapabilityOverride_campaignId_role_capability_key" ON "CampaignRoleCapabilityOverride"("campaignId", "role", "capability");
CREATE INDEX "CampaignRoleCapabilityOverride_campaignId_role_idx" ON "CampaignRoleCapabilityOverride"("campaignId", "role");

ALTER TABLE "CampaignMember" ADD COLUMN "partyId" TEXT;
CREATE INDEX "CampaignMember_partyId_idx" ON "CampaignMember"("partyId");

ALTER TABLE "WikiPage" ADD COLUMN "ownerType" TEXT NOT NULL DEFAULT 'STAFF';
ALTER TABLE "WikiPage" ADD COLUMN "ownerUserId" TEXT;
ALTER TABLE "WikiPage" ADD COLUMN "ownerPartyId" TEXT;
ALTER TABLE "WikiPage" ADD COLUMN "createdByUserId" TEXT;

ALTER TABLE "Asset" ADD COLUMN "uploadedByUserId" TEXT;

-- Default party per campaign
INSERT INTO "Party" ("id", "campaignId", "displayName", "createdAt", "updatedAt")
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
  c."id",
  CASE
    WHEN trim(c."name") != '' THEN trim(c."name") || ' — Party'
    ELSE 'The Party'
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Campaign" c
WHERE NOT EXISTS (SELECT 1 FROM "Party" p WHERE p."campaignId" = c."id");

UPDATE "CampaignMember"
SET "partyId" = (
  SELECT p."id" FROM "Party" p
  WHERE p."campaignId" = "CampaignMember"."campaignId"
  ORDER BY p."createdAt" ASC
  LIMIT 1
)
WHERE "partyId" IS NULL;

UPDATE "WikiPage"
SET "ownerType" = 'PARTY',
    "ownerPartyId" = (
      SELECT p."id" FROM "Party" p
      WHERE p."campaignId" = "WikiPage"."campaignId"
      ORDER BY p."createdAt" ASC
      LIMIT 1
    )
WHERE "templateType" IN ('SESSION_NOTE', 'QUEST')
   OR "workspace" = 'ADVENTURE';

UPDATE "WikiPage"
SET "ownerType" = 'USER',
    "ownerUserId" = (
      SELECT ws."lastEditedByUserId" FROM "WikiPageStats" ws
      WHERE ws."pageId" = "WikiPage"."id"
    )
WHERE "templateType" = 'JOURNAL'
  AND EXISTS (
    SELECT 1 FROM "WikiPageStats" ws
    WHERE ws."pageId" = "WikiPage"."id" AND ws."lastEditedByUserId" IS NOT NULL
  );
