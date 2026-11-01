-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "sizeBytes" BIGINT;

-- CreateTable
CREATE TABLE "ProcessingConnection" (
    "monthlyRequests" INTEGER,
    "monthlyDurationMs" BIGINT,
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "encryptedCredential" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "allowPrivateNetwork" BOOLEAN NOT NULL DEFAULT false,
    "capabilities" JSONB NOT NULL,
    "operatorLabel" TEXT,
    "billingLabel" TEXT,
    "concurrency" INTEGER NOT NULL DEFAULT 1,
    "timeoutSeconds" INTEGER NOT NULL DEFAULT 3600,
    "maxRequestBytes" BIGINT NOT NULL DEFAULT 1073741824,
    "formats" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unverified',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessingConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessingModel" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "capabilities" JSONB NOT NULL,

    CONSTRAINT "ProcessingModel_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProcessingModel_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ProcessingConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcessingCampaignGrant" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "modelIds" JSONB NOT NULL,
    "monthlyRequests" INTEGER,
    "monthlyDurationMs" BIGINT,
    "revision" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProcessingCampaignGrant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProcessingCampaignGrant_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProcessingCampaignGrant_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ProcessingConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcessingUsage" (
    "startedRequests" INTEGER NOT NULL DEFAULT 0,
    "startedDurationMs" BIGINT NOT NULL DEFAULT 0,
    "completedRequests" INTEGER NOT NULL DEFAULT 0,
    "completedDurationMs" BIGINT NOT NULL DEFAULT 0,
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "modelId" TEXT,
    "feature" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "durationMs" BIGINT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "failureCode" TEXT,
    "tokens" BIGINT,
    "reportedCost" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcessingUsage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProcessingUsage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AudioSettings" (
    "id" TEXT NOT NULL DEFAULT 'GLOBAL_AUDIO',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "transcriptionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxFileBytes" BIGINT NOT NULL DEFAULT 1073741824,
    "maxSessionBytes" BIGINT NOT NULL DEFAULT 5368709120,
    "maxCampaignBytes" BIGINT NOT NULL DEFAULT 10737418240,
    "maxGlobalBytes" BIGINT,
    "maxTranscriptBytes" INTEGER NOT NULL DEFAULT 10485760,
    "uploadConcurrency" INTEGER NOT NULL DEFAULT 2,
    "allowedFormats" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AudioSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAudioSettings" (
    "campaignId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "transcriptionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "allowContributors" BOOLEAN NOT NULL DEFAULT false,
    "allowChapters" BOOLEAN NOT NULL DEFAULT false,
    "allowTranscripts" BOOLEAN NOT NULL DEFAULT false,
    "allowPov" BOOLEAN NOT NULL DEFAULT false,
    "defaultVisibility" TEXT NOT NULL DEFAULT 'campaign',
    "defaultConnectionId" TEXT,
    "defaultModelId" TEXT,
    "maxStorageBytes" BIGINT,
    "monthlyRequests" INTEGER,
    "monthlyDurationMs" BIGINT,

    CONSTRAINT "CampaignAudioSettings_pkey" PRIMARY KEY ("campaignId"),
    CONSTRAINT "CampaignAudioSettings_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionRecording" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "timelineId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'campaign',
    "status" TEXT NOT NULL DEFAULT 'uploading',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionRecording_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SessionRecording_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SessionRecording_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "CampaignSessionTimeline"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionRecordingFile" (
    "id" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "offsetMs" INTEGER NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "format" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,

    CONSTRAINT "SessionRecordingFile_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SessionRecordingFile_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "SessionRecording"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SessionRecordingFile_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionAudioChapter" (
    "id" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startMs" INTEGER NOT NULL,
    "fileId" TEXT NOT NULL,
    "fileStartMs" INTEGER NOT NULL,
    "wikiPageId" TEXT,

    CONSTRAINT "SessionAudioChapter_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SessionAudioChapter_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "SessionRecording"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionTranscript" (
    "id" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "publishedRevisionId" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SessionTranscript_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SessionTranscript_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "SessionRecording"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionTranscriptRevision" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "language" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "providerConnectionId" TEXT,
    "providerModelId" TEXT,
    "sourceJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionTranscriptRevision_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SessionTranscriptRevision_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "SessionTranscript"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionTranscriptSegment" (
    "groupId" TEXT,
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "startMs" INTEGER,
    "endMs" INTEGER,
    "text" TEXT NOT NULL,
    "speaker" TEXT,
    "fileId" TEXT,
    "fileStartMs" INTEGER,
    "fileEndMs" INTEGER,

    CONSTRAINT "SessionTranscriptSegment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SessionTranscriptSegment_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "SessionTranscriptRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssetUploadSession" (
    "purpose" TEXT NOT NULL DEFAULT 'session_audio',
    "assetId" TEXT,
    "pendingStorageUrl" TEXT,
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "recordingId" TEXT,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "offsetBytes" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'uploading',
    "fileId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetUploadSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AssetUploadSession_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AssetUploadSession_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "SessionRecording"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TranscriptionJob" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "modelId" TEXT,
    "grantRevision" INTEGER NOT NULL,
    "recordingRevision" INTEGER NOT NULL,
    "transcriptRevision" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "failureCode" TEXT,
    "fileResults" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "claimedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptionJob_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TranscriptionJob_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TranscriptionJob_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "SessionRecording"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessingModel_connectionId_key_key" ON "ProcessingModel"("connectionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessingCampaignGrant_campaignId_connectionId_feature_cap_key" ON "ProcessingCampaignGrant"("campaignId", "connectionId", "feature", "capability");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessingUsage_jobId_key" ON "ProcessingUsage"("jobId");

-- CreateIndex
CREATE INDEX "ProcessingUsage_campaignId_connectionId_month_idx" ON "ProcessingUsage"("campaignId", "connectionId", "month");

-- CreateIndex
CREATE INDEX "SessionRecording_campaignId_timelineId_idx" ON "SessionRecording"("campaignId", "timelineId");

-- CreateIndex
CREATE INDEX "SessionRecordingFile_recordingId_order_idx" ON "SessionRecordingFile"("recordingId", "order");

-- CreateIndex
CREATE INDEX "SessionRecordingFile_assetId_idx" ON "SessionRecordingFile"("assetId");

-- CreateIndex
CREATE INDEX "SessionAudioChapter_recordingId_startMs_idx" ON "SessionAudioChapter"("recordingId", "startMs");

-- CreateIndex
CREATE UNIQUE INDEX "SessionTranscript_recordingId_key" ON "SessionTranscript"("recordingId");

-- CreateIndex
CREATE INDEX "SessionTranscriptRevision_transcriptId_createdAt_idx" ON "SessionTranscriptRevision"("transcriptId", "createdAt");

-- CreateIndex
CREATE INDEX "SessionTranscriptSegment_revisionId_order_idx" ON "SessionTranscriptSegment"("revisionId", "order");

-- CreateIndex
CREATE INDEX "AssetUploadSession_campaignId_status_idx" ON "AssetUploadSession"("campaignId", "status");

-- CreateIndex
CREATE INDEX "AssetUploadSession_userId_status_idx" ON "AssetUploadSession"("userId", "status");

-- CreateIndex
CREATE INDEX "TranscriptionJob_status_createdAt_idx" ON "TranscriptionJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TranscriptionJob_campaignId_recordingId_idx" ON "TranscriptionJob"("campaignId", "recordingId");
