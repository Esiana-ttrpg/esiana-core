import type { SystemSetting } from '@prisma/client';
import {
  sanitizeAppearanceProfile,
  serializeAppearanceProfileForApi,
} from './appearanceProfile.js';
import { sanitizeFooterAlignment } from './footerAlignment.js';
import { DEFAULT_PLUGIN_REGISTRY_URL } from './pluginManifest.js';
import { prisma } from './prisma.js';
import { env } from '../config/env.js';
import { DEFAULT_TIMEZONE } from './timezone.js';
import { resolveInstanceDefaultUiLocale } from '../../../shared/uiLocale.js';

export const SYSTEM_SETTINGS_ID = 'GLOBAL_CONFIG';

const DEFAULT_MAX_UPLOAD_MB = 10;
const DEFAULT_MAP_DISPLAY_MAX_EDGE = 8192;
const DEFAULT_MAP_THUMB_MAX_EDGE = 2048;

export const DEFAULT_GLOBAL_TITLE = 'Esiana';

function serializeFooter(row: SystemSetting) {
  return {
    customText: row.footerCustomText ?? '',
    tosUrl: row.footerTosUrl ?? '',
    privacyPolicyUrl: row.footerPrivacyPolicyUrl ?? '',
    discordUrl: row.footerDiscordUrl ?? '',
    githubUrl: row.footerGithubUrl ?? '',
    alignment: sanitizeFooterAlignment(row.footerAlignment) ?? 'center',
  };
}

export async function bootstrapSystemSettings(): Promise<SystemSetting> {
  return prisma.systemSetting.upsert({
    where: { id: SYSTEM_SETTINGS_ID },
    create: {
      id: SYSTEM_SETTINGS_ID,
      pluginRegistryUrl: DEFAULT_PLUGIN_REGISTRY_URL,
      globalTitle: DEFAULT_GLOBAL_TITLE,
    },
    update: {},
  });
}

export function serializeSystemSettings(row: SystemSetting) {
  return {
    id: row.id,
    registration: {
      allowRegistrations: row.allowRegistrations,
      allowedDomains: row.allowedDomains ?? '',
    },
    smtp: {
      host: row.smtpHost ?? '',
      port: row.smtpPort ?? 587,
      user: row.smtpUser ?? '',
      password: row.smtpPassword ?? '',
      secure: row.smtpSecure,
      fromAddress: row.smtpFromAddress ?? '',
    },
    uploads: {
      maxUploadSizeMb: row.maxUploadSizeMb,
      mapMaxUploadSizeMb: row.mapMaxUploadSizeMb,
      mapDisplayMaxEdge: row.mapDisplayMaxEdge,
      mapThumbMaxEdge: row.mapThumbMaxEdge,
      mapPreserveFullRes: row.mapPreserveFullRes,
      allowedImageTypes: row.allowedImageTypes ?? 'png,jpeg,webp',
      maxImageWidth: row.maxImageWidth,
      maxImageHeight: row.maxImageHeight,
    },
    urlImports: {
      enabled: row.urlImportsEnabled ?? true,
      allowHttp: row.urlImportAllowHttp ?? false,
      maxDownloadMb: row.urlImportMaxDownloadMb ?? 50,
      timeoutSeconds: row.urlImportTimeoutSeconds ?? 15,
    },
    status: {
      maintenanceMode: row.maintenanceMode,
      systemBannerText: row.systemBannerText ?? '',
      systemBannerExpiresAt: row.systemBannerExpiresAt?.toISOString() ?? null,
    },
    plugins: {
      registryUrl: row.pluginRegistryUrl ?? DEFAULT_PLUGIN_REGISTRY_URL,
    },
    branding: {
      globalTitle: row.globalTitle ?? DEFAULT_GLOBAL_TITLE,
      globalLogoUrl: row.globalLogoUrl ?? null,
      faviconUrl: row.faviconUrl ?? null,
      globalThemePreset: row.globalThemePreset ?? 'dark',
      globalPalette: row.globalPalette ?? 'ocean',
      applyBackgroundTint: row.applyBackgroundTint ?? false,
      appearanceProfile: serializeAppearanceProfileForApi(
        sanitizeAppearanceProfile(row.appearanceProfile) ?? null,
      ),
    },
    footer: serializeFooter(row),
    notifications: {
      pollIntervalSeconds: row.notificationPollIntervalSeconds ?? 60,
      defaultTimezone: row.defaultTimezone ?? DEFAULT_TIMEZONE,
    },
    relations: {
      maxVisibleNodes: row.relationsMaxVisibleNodes,
      maxVisibleEdges: row.relationsMaxVisibleEdges,
    },
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function isSystemBannerActive(row: SystemSetting): boolean {
  const banner = row.systemBannerText?.trim() ?? '';
  if (!banner) return false;
  if (!row.systemBannerExpiresAt) return false;
  return new Date() < row.systemBannerExpiresAt;
}

export function serializePublicSystemSettings(row: SystemSetting) {
  const active = isSystemBannerActive(row);
  const banner = active ? (row.systemBannerText?.trim() ?? '') : '';
  return {
    systemBannerText: banner,
    systemBannerExpiresAt: active
      ? row.systemBannerExpiresAt!.toISOString()
      : null,
    maintenanceMode: row.maintenanceMode,
    globalTitle: row.globalTitle ?? DEFAULT_GLOBAL_TITLE,
    globalLogoUrl: row.globalLogoUrl ?? null,
    faviconUrl: row.faviconUrl ?? null,
    globalThemePreset: row.globalThemePreset ?? 'dark',
    globalPalette: row.globalPalette ?? 'ocean',
    applyBackgroundTint: row.applyBackgroundTint ?? false,
    appearanceProfile: serializeAppearanceProfileForApi(
      sanitizeAppearanceProfile(row.appearanceProfile) ?? null,
    ),
    footer: serializeFooter(row),
    defaultTimezone: row.defaultTimezone ?? DEFAULT_TIMEZONE,
    defaultUiLocale: resolveInstanceDefaultUiLocale(env.defaultUiLocale),
  };
}

export async function getOrCreateSystemSettings(): Promise<SystemSetting> {
  return bootstrapSystemSettings();
}

export function parseAllowedDomains(raw: string | null | undefined): string[] {
  const text = (raw ?? '').trim();
  if (!text) return [];
  return text
    .split(/[\s,;]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowedForRegistration(
  email: string,
  allowedDomains: string | null | undefined,
): boolean {
  const domains = parseAllowedDomains(allowedDomains);
  if (domains.length === 0) return true;

  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase();

  return domains.some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`),
  );
}

export async function getMaxUploadSizeBytes(): Promise<number> {
  const row = await getOrCreateSystemSettings();
  const mb = row.maxUploadSizeMb > 0 ? row.maxUploadSizeMb : DEFAULT_MAX_UPLOAD_MB;
  return mb * 1024 * 1024;
}

export async function getMapMaxUploadSizeBytes(): Promise<number> {
  const row = await getOrCreateSystemSettings();
  const mapMb = row.mapMaxUploadSizeMb;
  if (typeof mapMb === 'number' && mapMb > 0) {
    return mapMb * 1024 * 1024;
  }
  return getMaxUploadSizeBytes();
}

export interface MapProcessingSettings {
  preserveFullRes: boolean;
  displayMaxEdge: number;
  thumbMaxEdge: number;
}

export async function getMapProcessingSettings(): Promise<MapProcessingSettings> {
  const row = await getOrCreateSystemSettings();
  return {
    preserveFullRes:
      row.mapPreserveFullRes || env.mapPreserveFullRes,
    displayMaxEdge:
      row.mapDisplayMaxEdge > 0
        ? row.mapDisplayMaxEdge
        : env.mapDisplayMaxEdge || DEFAULT_MAP_DISPLAY_MAX_EDGE,
    thumbMaxEdge:
      row.mapThumbMaxEdge > 0
        ? row.mapThumbMaxEdge
        : env.mapThumbMaxEdge || DEFAULT_MAP_THUMB_MAX_EDGE,
  };
}
