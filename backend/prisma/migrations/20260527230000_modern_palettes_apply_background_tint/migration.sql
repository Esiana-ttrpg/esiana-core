-- Rename tint flag and migrate legacy palette ids
ALTER TABLE "SystemSetting" RENAME COLUMN "globalPaletteApplyTints" TO "applyBackgroundTint";
UPDATE "SystemSetting" SET "globalPalette" = 'ember' WHERE "globalPalette" = 'sunset';
