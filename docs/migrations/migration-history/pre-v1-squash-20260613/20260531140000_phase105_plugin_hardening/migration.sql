-- Phase 10.5 plugin hardening: diagnostics, provenance, quarantine
ALTER TABLE "InstalledPlugin" ADD COLUMN "manifestChecksum" TEXT NOT NULL DEFAULT '';
ALTER TABLE "InstalledPlugin" ADD COLUMN "trustedInstall" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InstalledPlugin" ADD COLUMN "installedByUserId" TEXT;
ALTER TABLE "InstalledPlugin" ADD COLUMN "runtimeStatus" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "InstalledPlugin" ADD COLUMN "quarantineReason" TEXT;
ALTER TABLE "InstalledPlugin" ADD COLUMN "quarantinedAt" DATETIME;
ALTER TABLE "InstalledPlugin" ADD COLUMN "recentErrors" JSON NOT NULL DEFAULT '[]';
