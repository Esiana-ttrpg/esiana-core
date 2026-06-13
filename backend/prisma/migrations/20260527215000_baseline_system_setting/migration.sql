-- Baseline: SystemSetting was maintained via db push before incremental migrations.
-- Shadow-database replays need the table to exist before palette migrations alter it.
CREATE TABLE IF NOT EXISTS "SystemSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'GLOBAL_CONFIG',
    "allowRegistrations" BOOLEAN NOT NULL DEFAULT true,
    "allowedDomains" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER DEFAULT 587,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpFromAddress" TEXT,
    "maxUploadSizeMb" INTEGER NOT NULL DEFAULT 10,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "systemBannerText" TEXT,
    "systemBannerExpiresAt" DATETIME,
    "pluginRegistryUrl" TEXT NOT NULL DEFAULT 'https://raw.githubusercontent.com/Esiana-ttrpg/community-plugins/main/registry.json',
    "globalTitle" TEXT NOT NULL DEFAULT 'Esiana',
    "globalLogoUrl" TEXT,
    "globalThemePreset" TEXT NOT NULL DEFAULT 'dark',
    "globalPalette" TEXT NOT NULL DEFAULT 'ocean',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
