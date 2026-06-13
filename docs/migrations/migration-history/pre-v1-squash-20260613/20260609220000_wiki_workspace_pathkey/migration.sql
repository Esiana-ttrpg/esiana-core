-- CreateEnum
-- Prisma SQLite: enums stored as TEXT
-- CampaignWorkspace values added to WikiPage

-- AlterTable
ALTER TABLE "WikiPage" ADD COLUMN "workspace" TEXT;
ALTER TABLE "WikiPage" ADD COLUMN "pathKey" TEXT;

-- CreateIndex
CREATE INDEX "WikiPage_campaignId_workspace_idx" ON "WikiPage"("campaignId", "workspace");

-- CreateIndex
CREATE UNIQUE INDEX "WikiPage_campaignId_workspace_pathKey_key" ON "WikiPage"("campaignId", "workspace", "pathKey");
