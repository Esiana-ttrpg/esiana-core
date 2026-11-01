-- CreateTable
CREATE TABLE "SafetyPrivacyEligibility" (
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SafetyPrivacyEligibility_pkey" PRIMARY KEY ("campaignId","userId"),
    CONSTRAINT "SafetyPrivacyEligibility_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SafetyPrivacyEligibility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SafetyPrivacyRequest" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "relatedContentType" TEXT,
    "relatedContentId" TEXT,
    "description" TEXT NOT NULL,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolverId" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SafetyPrivacyRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SafetyPrivacyRequest_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SafetyPrivacyRequestMessage" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyPrivacyRequestMessage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SafetyPrivacyRequestMessage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SafetyPrivacyRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SafetyPrivacyRequestEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafetyPrivacyRequestEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SafetyPrivacyRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SafetyPrivacyRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SafetyPrivacyRequestRead" (
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,

    CONSTRAINT "SafetyPrivacyRequestRead_pkey" PRIMARY KEY ("requestId","userId"),
    CONSTRAINT "SafetyPrivacyRequestRead_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "SafetyPrivacyRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SafetyPrivacyRequest_campaignId_status_updatedAt_idx" ON "SafetyPrivacyRequest"("campaignId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "SafetyPrivacyRequest_requesterId_updatedAt_idx" ON "SafetyPrivacyRequest"("requesterId", "updatedAt");

-- CreateIndex
CREATE INDEX "SafetyPrivacyRequestMessage_requestId_createdAt_idx" ON "SafetyPrivacyRequestMessage"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "SafetyPrivacyRequestEvent_requestId_createdAt_idx" ON "SafetyPrivacyRequestEvent"("requestId", "createdAt");


-- Preserve current participation for future membership changes.
INSERT INTO "SafetyPrivacyEligibility" ("campaignId", "userId") SELECT "campaignId", "userId" FROM "CampaignMember";
