-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "archivedAt" DATETIME;

-- CreateIndex
CREATE INDEX "Campaign_archivedAt_idx" ON "Campaign"("archivedAt");
