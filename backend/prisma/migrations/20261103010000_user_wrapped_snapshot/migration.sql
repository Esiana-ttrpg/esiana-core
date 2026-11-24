-- CreateTable
CREATE TABLE "UserWrappedSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "edition" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "regeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWrappedSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserWrappedSnapshot_userId_year_idx" ON "UserWrappedSnapshot"("userId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "UserWrappedSnapshot_userId_year_key" ON "UserWrappedSnapshot"("userId", "year");

-- AddForeignKey
ALTER TABLE "UserWrappedSnapshot" ADD CONSTRAINT "UserWrappedSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
