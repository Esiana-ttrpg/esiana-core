ALTER TABLE "WritingSession" ADD COLUMN "openLock" TEXT;
ALTER TABLE "WritingSession" ADD COLUMN "intervalVersion" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "WritingSession_openLock_key" ON "WritingSession"("openLock");
