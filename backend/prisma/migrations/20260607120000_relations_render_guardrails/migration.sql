-- Relations workspace render safety caps (global admin, optional overrides).
ALTER TABLE "SystemSetting" ADD COLUMN "relationsMaxVisibleNodes" INTEGER;
ALTER TABLE "SystemSetting" ADD COLUMN "relationsMaxVisibleEdges" INTEGER;
