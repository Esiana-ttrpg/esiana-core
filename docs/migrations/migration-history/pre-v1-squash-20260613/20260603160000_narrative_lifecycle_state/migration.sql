-- CreateTable
CREATE TABLE "NarrativeLifecycleState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "subjectKind" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "lifecycleState" TEXT NOT NULL,
    "semanticsVersion" TEXT NOT NULL DEFAULT 'narrative-lifecycle-v1',
    "updatedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NarrativeLifecycleState_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NarrativeLifecycleState_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "NarrativeLifecycleState_campaignId_subjectKind_subjectId_key" ON "NarrativeLifecycleState"("campaignId", "subjectKind", "subjectId");

-- CreateIndex
CREATE INDEX "NarrativeLifecycleState_campaignId_subjectKind_lifecycleState_idx" ON "NarrativeLifecycleState"("campaignId", "subjectKind", "lifecycleState");
