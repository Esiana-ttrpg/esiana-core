ALTER TABLE "CalendarEvent" ADD COLUMN "importance" TEXT NOT NULL DEFAULT 'MINOR';

CREATE TABLE "ChronologySettings" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "manualEventImportance" TEXT NOT NULL DEFAULT 'MINOR',
    "downtimeEventImportance" TEXT NOT NULL DEFAULT 'NOTICE',
    "progressionEventImportance" TEXT NOT NULL DEFAULT 'NOTICE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChronologySettings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChronologySettings_campaignId_key" UNIQUE ("campaignId"),
    CONSTRAINT "ChronologySettings_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ChronologySettings_campaignId_idx" ON "ChronologySettings"("campaignId");
