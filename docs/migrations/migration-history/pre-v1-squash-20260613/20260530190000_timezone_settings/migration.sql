-- User timezone preference and system default timezone

ALTER TABLE "User" ADD COLUMN "timezone" TEXT;

ALTER TABLE "SystemSetting" ADD COLUMN "defaultTimezone" TEXT NOT NULL DEFAULT 'UTC';
