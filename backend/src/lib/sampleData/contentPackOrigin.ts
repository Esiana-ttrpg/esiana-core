export interface ContentPackOrigin {
  pluginId: string;
  pluginVersion: string;
  packId: string;
  packName: string;
  author?: string;
  authorUrl?: string;
  importedAt: string;
}

const ORIGIN_KEY = 'contentPackOrigin';

export function readContentPackOrigin(
  appearanceProfile: unknown,
): ContentPackOrigin | null {
  if (!appearanceProfile || typeof appearanceProfile !== 'object' || Array.isArray(appearanceProfile)) {
    return null;
  }
  const raw = (appearanceProfile as Record<string, unknown>)[ORIGIN_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.pluginId !== 'string' || typeof record.packId !== 'string') return null;
  if (typeof record.packName !== 'string' || typeof record.importedAt !== 'string') return null;
  return {
    pluginId: record.pluginId,
    pluginVersion:
      typeof record.pluginVersion === 'string' && record.pluginVersion.trim()
        ? record.pluginVersion.trim()
        : 'unknown',
    packId: record.packId,
    packName: record.packName,
    ...(typeof record.author === 'string' ? { author: record.author } : {}),
    ...(typeof record.authorUrl === 'string' ? { authorUrl: record.authorUrl } : {}),
    importedAt: record.importedAt,
  };
}

export function mergeContentPackOrigin(
  appearanceProfile: unknown,
  origin: ContentPackOrigin,
): Record<string, unknown> {
  const base =
    appearanceProfile && typeof appearanceProfile === 'object' && !Array.isArray(appearanceProfile)
      ? { ...(appearanceProfile as Record<string, unknown>) }
      : {};
  return { ...base, [ORIGIN_KEY]: origin };
}
