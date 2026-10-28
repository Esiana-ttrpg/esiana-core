-- Rebuild the metadata table transactionally on both PostgreSQL and SQLite.
-- No tables reference SessionRecordingFile through foreign keys; annotation anchors
-- retain their stable file IDs. Physical assets are not modified.
BEGIN;

CREATE TABLE "_SessionRecordingFile_no_action" AS SELECT * FROM "SessionRecordingFile";
DROP TABLE "SessionRecordingFile";

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
    CONSTRAINT "SessionRecordingFile_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE NO ACTION ON UPDATE CASCADE
);

INSERT INTO "SessionRecordingFile" ("id", "recordingId", "assetId", "name", "order", "durationMs", "offsetMs", "sizeBytes", "format", "mimeType")
SELECT "id", "recordingId", "assetId", "name", "order", "durationMs", "offsetMs", "sizeBytes", "format", "mimeType"
FROM "_SessionRecordingFile_no_action";
DROP TABLE "_SessionRecordingFile_no_action";

CREATE INDEX "SessionRecordingFile_recordingId_order_idx" ON "SessionRecordingFile"("recordingId", "order");
CREATE INDEX "SessionRecordingFile_assetId_idx" ON "SessionRecordingFile"("assetId");

COMMIT;
