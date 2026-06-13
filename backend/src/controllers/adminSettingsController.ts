import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  getOrCreateSystemSettings,
  serializeSystemSettings,
  SYSTEM_SETTINGS_ID,
} from '../lib/systemSettings.js';
import {
  faviconConstraintsHelpText,
  isAllowedFaviconUrl,
} from '../lib/faviconConstraints.js';
import { sanitizeFooterAlignment } from '../lib/footerAlignment.js';
import { sanitizeAppearanceProfile } from '../lib/appearanceProfile.js';
import { sanitizeGlobalPalette } from '../lib/globalPalette.js';
import { sanitizeThemePreset } from '../lib/themePresets.js';
import { sanitizeTimezone } from '../lib/timezone.js';
import { prisma } from '../lib/prisma.js';
import { invalidateMailTransporterCache } from '../lib/mail/mailSender.js';

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (value === null) return '';
  return typeof value === 'string' ? value : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'boolean' ? value : undefined;
}

const BANNER_DURATIONS = new Set(['clear', '1h', '3h', 'custom']);

function parseBannerExpiresAt(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value.trim());
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function resolveBannerExpiresAt(
  bannerDuration: string,
  customExpiresAt: unknown,
): Date | null | undefined {
  if (bannerDuration === '1h') {
    return new Date(Date.now() + 60 * 60 * 1000);
  }
  if (bannerDuration === '3h') {
    return new Date(Date.now() + 3 * 60 * 60 * 1000);
  }
  if (bannerDuration === 'custom') {
    const parsed = parseBannerExpiresAt(customExpiresAt);
    return parsed ?? undefined;
  }
  return undefined;
}

function optionalPositiveInt(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10);
    return parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

export async function getAdminSettings(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const row = await getOrCreateSystemSettings();
  res.json({ settings: serializeSystemSettings(row) });
}

export async function patchAdminSettings(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  const registration = body.registration as Record<string, unknown> | undefined;
  if (registration && typeof registration === 'object') {
    const allowRegistrations = optionalBoolean(registration.allowRegistrations);
    const allowedDomains = optionalString(registration.allowedDomains);
    if (allowRegistrations !== undefined) {
      data.allowRegistrations = allowRegistrations;
    }
    if (allowedDomains !== undefined) data.allowedDomains = allowedDomains;
  }

  const smtp = body.smtp as Record<string, unknown> | undefined;
  let smtpUpdated = false;
  if (smtp && typeof smtp === 'object') {
    const host = optionalString(smtp.host);
    const port = optionalPositiveInt(smtp.port);
    const user = optionalString(smtp.user);
    const password = optionalString(smtp.password);
    const secure = optionalBoolean(smtp.secure);
    const fromAddress = optionalString(smtp.fromAddress);
    if (host !== undefined) {
      data.smtpHost = host;
      smtpUpdated = true;
    }
    if (port !== undefined) {
      data.smtpPort = port;
      smtpUpdated = true;
    }
    if (user !== undefined) {
      data.smtpUser = user;
      smtpUpdated = true;
    }
    if (password !== undefined) {
      data.smtpPassword = password;
      smtpUpdated = true;
    }
    if (secure !== undefined) {
      data.smtpSecure = secure;
      smtpUpdated = true;
    }
    if (fromAddress !== undefined) {
      data.smtpFromAddress = fromAddress;
      smtpUpdated = true;
    }
  }

  const uploads = body.uploads as Record<string, unknown> | undefined;
  if (uploads && typeof uploads === 'object') {
    const maxUploadSizeMb = optionalPositiveInt(uploads.maxUploadSizeMb);
    if (maxUploadSizeMb !== undefined) data.maxUploadSizeMb = maxUploadSizeMb;

    if (Object.prototype.hasOwnProperty.call(uploads, 'mapMaxUploadSizeMb')) {
      const raw = uploads.mapMaxUploadSizeMb;
      if (raw === null || raw === '' || raw === 0) {
        data.mapMaxUploadSizeMb = null;
      } else {
        const mapMaxUploadSizeMb = optionalPositiveInt(raw);
        if (mapMaxUploadSizeMb === undefined) {
          res.status(400).json({ error: 'mapMaxUploadSizeMb must be a positive integer or null' });
          return;
        }
        data.mapMaxUploadSizeMb = mapMaxUploadSizeMb;
      }
    }

    const mapDisplayMaxEdge = optionalPositiveInt(uploads.mapDisplayMaxEdge);
    if (mapDisplayMaxEdge !== undefined) {
      if (mapDisplayMaxEdge < 512 || mapDisplayMaxEdge > 16384) {
        res.status(400).json({ error: 'mapDisplayMaxEdge must be between 512 and 16384' });
        return;
      }
      data.mapDisplayMaxEdge = mapDisplayMaxEdge;
    }

    const mapThumbMaxEdge = optionalPositiveInt(uploads.mapThumbMaxEdge);
    if (mapThumbMaxEdge !== undefined) {
      if (mapThumbMaxEdge < 128 || mapThumbMaxEdge > 4096) {
        res.status(400).json({ error: 'mapThumbMaxEdge must be between 128 and 4096' });
        return;
      }
      data.mapThumbMaxEdge = mapThumbMaxEdge;
    }

    const mapPreserveFullRes = optionalBoolean(uploads.mapPreserveFullRes);
    if (mapPreserveFullRes !== undefined) {
      data.mapPreserveFullRes = mapPreserveFullRes;
    }

    const allowedImageTypes = optionalString(uploads.allowedImageTypes);
    if (allowedImageTypes !== undefined) {
      data.allowedImageTypes = allowedImageTypes.trim() || null;
    }

    const maxImageWidth = optionalPositiveInt(uploads.maxImageWidth);
    if (maxImageWidth !== undefined) {
      if (maxImageWidth < 256 || maxImageWidth > 32768) {
        res.status(400).json({ error: 'maxImageWidth must be between 256 and 32768' });
        return;
      }
      data.maxImageWidth = maxImageWidth;
    }

    const maxImageHeight = optionalPositiveInt(uploads.maxImageHeight);
    if (maxImageHeight !== undefined) {
      if (maxImageHeight < 256 || maxImageHeight > 32768) {
        res.status(400).json({ error: 'maxImageHeight must be between 256 and 32768' });
        return;
      }
      data.maxImageHeight = maxImageHeight;
    }
  }

  const urlImports = body.urlImports as Record<string, unknown> | undefined;
  if (urlImports && typeof urlImports === 'object') {
    const enabled = optionalBoolean(urlImports.enabled);
    if (enabled !== undefined) data.urlImportsEnabled = enabled;

    const allowHttp = optionalBoolean(urlImports.allowHttp);
    if (allowHttp !== undefined) data.urlImportAllowHttp = allowHttp;

    const maxDownloadMb = optionalPositiveInt(urlImports.maxDownloadMb);
    if (maxDownloadMb !== undefined) {
      if (maxDownloadMb > 500) {
        res.status(400).json({ error: 'maxDownloadMb must be 500 or less' });
        return;
      }
      data.urlImportMaxDownloadMb = maxDownloadMb;
    }

    const timeoutSeconds = optionalPositiveInt(urlImports.timeoutSeconds);
    if (timeoutSeconds !== undefined) {
      if (timeoutSeconds < 5 || timeoutSeconds > 120) {
        res.status(400).json({ error: 'timeoutSeconds must be between 5 and 120' });
        return;
      }
      data.urlImportTimeoutSeconds = timeoutSeconds;
    }
  }

  const relations = body.relations as Record<string, unknown> | undefined;
  if (relations && typeof relations === 'object') {
    if (Object.prototype.hasOwnProperty.call(relations, 'maxVisibleNodes')) {
      const raw = relations.maxVisibleNodes;
      if (raw === null || raw === '') {
        data.relationsMaxVisibleNodes = null;
      } else {
        const maxVisibleNodes = optionalPositiveInt(raw);
        if (maxVisibleNodes === undefined) {
          res.status(400).json({ error: 'relations.maxVisibleNodes must be a positive integer or null' });
          return;
        }
        if (maxVisibleNodes < 20 || maxVisibleNodes > 100) {
          res.status(400).json({ error: 'relations.maxVisibleNodes must be between 20 and 100' });
          return;
        }
        data.relationsMaxVisibleNodes = maxVisibleNodes;
      }
    }
    if (Object.prototype.hasOwnProperty.call(relations, 'maxVisibleEdges')) {
      const raw = relations.maxVisibleEdges;
      if (raw === null || raw === '') {
        data.relationsMaxVisibleEdges = null;
      } else {
        const maxVisibleEdges = optionalPositiveInt(raw);
        if (maxVisibleEdges === undefined) {
          res.status(400).json({ error: 'relations.maxVisibleEdges must be a positive integer or null' });
          return;
        }
        if (maxVisibleEdges < 40 || maxVisibleEdges > 200) {
          res.status(400).json({ error: 'relations.maxVisibleEdges must be between 40 and 200' });
          return;
        }
        data.relationsMaxVisibleEdges = maxVisibleEdges;
      }
    }
  }

  const status = body.status as Record<string, unknown> | undefined;
  if (status && typeof status === 'object') {
    const maintenanceMode = optionalBoolean(status.maintenanceMode);
    const systemBannerText = optionalString(status.systemBannerText);
    const bannerDuration =
      typeof status.bannerDuration === 'string'
        ? status.bannerDuration.trim()
        : undefined;

    if (maintenanceMode !== undefined) data.maintenanceMode = maintenanceMode;

    if (bannerDuration === 'clear') {
      data.systemBannerText = null;
      data.systemBannerExpiresAt = null;
    } else {
      if (systemBannerText !== undefined) {
        data.systemBannerText = systemBannerText || null;
      }

      if (bannerDuration && BANNER_DURATIONS.has(bannerDuration)) {
        if (bannerDuration === 'custom') {
          const customExpires = resolveBannerExpiresAt(
            bannerDuration,
            status.bannerExpiresAt,
          );
          if (customExpires === undefined) {
            res.status(400).json({
              error: 'bannerExpiresAt must be a valid datetime when bannerDuration is custom',
            });
            return;
          }
          if (!customExpires || customExpires.getTime() <= Date.now()) {
            res.status(400).json({
              error: 'bannerExpiresAt must be in the future for custom duration',
            });
            return;
          }
          data.systemBannerExpiresAt = customExpires;
        } else {
          const expiresAt = resolveBannerExpiresAt(bannerDuration, null);
          if (expiresAt) data.systemBannerExpiresAt = expiresAt;
        }
      }
    }
  }

  const plugins = body.plugins as Record<string, unknown> | undefined;
  if (plugins && typeof plugins === 'object') {
    const registryUrl = optionalString(plugins.registryUrl);
    if (registryUrl !== undefined) data.pluginRegistryUrl = registryUrl;
  }

  if ('pluginRegistryUrl' in body) {
    const registryUrl = optionalString(body.pluginRegistryUrl);
    if (registryUrl !== undefined) data.pluginRegistryUrl = registryUrl;
  }

  const branding = body.branding as Record<string, unknown> | undefined;
  if (branding && typeof branding === 'object') {
    const globalTitle = optionalString(branding.globalTitle);
    const globalLogoUrl = optionalString(branding.globalLogoUrl);
    if (globalTitle !== undefined) {
      // Store a non-empty sanitized title; fall back to default if cleared
      data.globalTitle = globalTitle.trim() || 'Esiana';
    }
    if (globalLogoUrl !== undefined) {
      // Accept empty string to clear, otherwise require http/https URL
      const cleaned = globalLogoUrl.trim();
      if (cleaned === '' || isHttpUrl(cleaned)) {
        data.globalLogoUrl = cleaned || null;
      }
    }
    const faviconUrl = optionalString(branding.faviconUrl);
    if (faviconUrl !== undefined) {
      const cleaned = faviconUrl.trim();
      if (cleaned === '') {
        data.faviconUrl = null;
      } else if (!isHttpUrl(cleaned)) {
        // ignore invalid scheme
      } else if (!isAllowedFaviconUrl(cleaned)) {
        res.status(400).json({
          error: `Invalid favicon URL. ${faviconConstraintsHelpText()}`,
        });
        return;
      } else {
        data.faviconUrl = cleaned;
      }
    }
    const globalThemePreset = optionalString(branding.globalThemePreset);
    if (globalThemePreset !== undefined) {
      const normalized = sanitizeThemePreset(globalThemePreset);
      if (!normalized) {
        res.status(400).json({
          error:
            'Invalid global theme preset. Valid values are light, dark, auto, fantasy, cyberpunk, parchment.',
        });
        return;
      }
      data.globalThemePreset = normalized;
    }
    const globalPalette = optionalString(branding.globalPalette);
    if (globalPalette !== undefined) {
      const normalizedPalette = sanitizeGlobalPalette(globalPalette);
      if (!normalizedPalette) {
        res.status(400).json({
          error:
            'Invalid global palette. Valid values: ocean, midnight, forest, ember, deep_space, sunset, desert, arctic, trans, pride, halloween, christmas.',
        });
        return;
      }
      data.globalPalette = normalizedPalette;
    }
    const applyBackgroundTint = optionalBoolean(
      branding.applyBackgroundTint ?? branding.globalPaletteApplyTints,
    );
    if (applyBackgroundTint !== undefined) {
      data.applyBackgroundTint = applyBackgroundTint;
    }
    if (Object.prototype.hasOwnProperty.call(branding, 'appearanceProfile')) {
      const sanitized = sanitizeAppearanceProfile(branding.appearanceProfile);
      if (branding.appearanceProfile !== null && sanitized === undefined) {
        res.status(400).json({
          error: 'appearanceProfile must be a valid object or null',
        });
        return;
      }
      data.appearanceProfile =
        sanitized === null || sanitized === undefined
          ? null
          : sanitized;
    }
  }

  const footer = body.footer as Record<string, unknown> | undefined;
  if (footer && typeof footer === 'object') {
    const customText = optionalString(footer.customText);
    const tosUrl = optionalString(footer.tosUrl);
    const privacyPolicyUrl = optionalString(footer.privacyPolicyUrl);
    const discordUrl = optionalString(footer.discordUrl);
    const githubUrl = optionalString(footer.githubUrl);
    const alignment = optionalString(footer.alignment);

    if (customText !== undefined) {
      data.footerCustomText = customText || null;
    }
    if (tosUrl !== undefined) {
      const cleaned = tosUrl.trim();
      if (cleaned === '' || isHttpUrl(cleaned)) {
        data.footerTosUrl = cleaned || null;
      }
    }
    if (privacyPolicyUrl !== undefined) {
      const cleaned = privacyPolicyUrl.trim();
      if (cleaned === '' || isHttpUrl(cleaned)) {
        data.footerPrivacyPolicyUrl = cleaned || null;
      }
    }
    if (discordUrl !== undefined) {
      const cleaned = discordUrl.trim();
      if (cleaned === '' || isHttpUrl(cleaned)) {
        data.footerDiscordUrl = cleaned || null;
      }
    }
    if (githubUrl !== undefined) {
      const cleaned = githubUrl.trim();
      if (cleaned === '' || isHttpUrl(cleaned)) {
        data.footerGithubUrl = cleaned || null;
      }
    }
    if (alignment !== undefined) {
      const normalized = sanitizeFooterAlignment(alignment);
      if (!normalized) {
        res.status(400).json({
          error: 'Invalid footer alignment. Valid values are left, center, right.',
        });
        return;
      }
      data.footerAlignment = normalized;
    }
  }

  const notifications = body.notifications as Record<string, unknown> | undefined;
  if (notifications && typeof notifications === 'object') {
    const pollIntervalSeconds = optionalPositiveInt(notifications.pollIntervalSeconds);
    if (pollIntervalSeconds !== undefined) {
      if (pollIntervalSeconds < 30 || pollIntervalSeconds > 300) {
        res.status(400).json({
          error: 'pollIntervalSeconds must be between 30 and 300',
        });
        return;
      }
      data.notificationPollIntervalSeconds = pollIntervalSeconds;
    }

    const defaultTimezone = optionalString(notifications.defaultTimezone);
    if (defaultTimezone !== undefined) {
      const trimmed = defaultTimezone.trim();
      if (!trimmed) {
        res.status(400).json({ error: 'defaultTimezone cannot be empty' });
        return;
      }
      const sanitized = sanitizeTimezone(trimmed);
      if (!sanitized) {
        res.status(400).json({ error: 'defaultTimezone must be a valid IANA timezone' });
        return;
      }
      data.defaultTimezone = sanitized;
    }
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'No valid settings fields to update' });
    return;
  }

  const row = await prisma.systemSetting.upsert({
    where: { id: SYSTEM_SETTINGS_ID },
    create: { id: SYSTEM_SETTINGS_ID, ...data },
    update: data,
  });

  if (smtpUpdated) {
    invalidateMailTransporterCache();
  }

  res.json({ settings: serializeSystemSettings(row) });
}
