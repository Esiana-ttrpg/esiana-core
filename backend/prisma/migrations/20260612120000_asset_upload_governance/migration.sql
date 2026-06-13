-- Asset upload governance settings
ALTER TABLE "SystemSetting" ADD COLUMN "allowedImageTypes" TEXT DEFAULT 'png,jpeg,webp';
ALTER TABLE "SystemSetting" ADD COLUMN "maxImageWidth" INTEGER NOT NULL DEFAULT 16384;
ALTER TABLE "SystemSetting" ADD COLUMN "maxImageHeight" INTEGER NOT NULL DEFAULT 16384;
ALTER TABLE "SystemSetting" ADD COLUMN "urlImportsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SystemSetting" ADD COLUMN "urlImportAllowHttp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SystemSetting" ADD COLUMN "urlImportMaxDownloadMb" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "SystemSetting" ADD COLUMN "urlImportTimeoutSeconds" INTEGER NOT NULL DEFAULT 15;
