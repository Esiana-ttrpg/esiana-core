-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'Public';

-- AlterTable
ALTER TABLE "SystemSetting" ADD COLUMN "mapMaxUploadSizeMb" INTEGER;
ALTER TABLE "SystemSetting" ADD COLUMN "mapDisplayMaxEdge" INTEGER NOT NULL DEFAULT 8192;
ALTER TABLE "SystemSetting" ADD COLUMN "mapThumbMaxEdge" INTEGER NOT NULL DEFAULT 2048;
ALTER TABLE "SystemSetting" ADD COLUMN "mapPreserveFullRes" BOOLEAN NOT NULL DEFAULT false;
