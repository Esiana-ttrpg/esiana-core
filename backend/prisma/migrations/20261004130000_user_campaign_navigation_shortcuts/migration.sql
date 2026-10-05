-- User-level opt-in for campaign navigation keyboard shortcuts.

ALTER TABLE "User" ADD COLUMN "campaignNavigationShortcutsEnabled" BOOLEAN NOT NULL DEFAULT false;
