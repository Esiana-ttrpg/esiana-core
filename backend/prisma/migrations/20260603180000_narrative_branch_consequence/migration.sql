-- Layer 2 branch runtime + consequence idempotency receipts

CREATE TABLE "NarrativeBranchState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "activeNodeId" TEXT NOT NULL,
    "semanticsVersion" TEXT NOT NULL DEFAULT 'narrative-branch-v1',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NarrativeBranchState_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "NarrativeBranchState_campaignId_subjectId_key" ON "NarrativeBranchState"("campaignId", "subjectId");
CREATE INDEX "NarrativeBranchState_campaignId_idx" ON "NarrativeBranchState"("campaignId");

CREATE TABLE "NarrativeConsequenceReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "semanticsVersion" TEXT NOT NULL DEFAULT 'narrative-consequence-v1',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NarrativeConsequenceReceipt_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "NarrativeConsequenceReceipt_campaignId_idempotencyKey_key" ON "NarrativeConsequenceReceipt"("campaignId", "idempotencyKey");
CREATE INDEX "NarrativeConsequenceReceipt_campaignId_subjectId_idx" ON "NarrativeConsequenceReceipt"("campaignId", "subjectId");
