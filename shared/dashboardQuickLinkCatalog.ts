/**
 * Curated quick-link targets for Campaign Home Quick Links widget.
 */

export const DASHBOARD_QUICK_LINK_KEYS = [
  'adventures',
  'party',
  'threads',
  'chronology',
  'maps',
  'codex',
  'sessionNotes',
  'recruitment',
] as const;

export type DashboardQuickLinkKey = (typeof DASHBOARD_QUICK_LINK_KEYS)[number];
export const DASHBOARD_EXTERNAL_LINK_ICONS = ['link', 'book', 'file', 'globe'] as const;
export type DashboardExternalLinkIcon = typeof DASHBOARD_EXTERNAL_LINK_ICONS[number];
export interface DashboardExternalLink {
  kind: 'external';
  id: string;
  label: string;
  url: string;
  icon?: DashboardExternalLinkIcon;
}
export type DashboardQuickLinkEntry = DashboardQuickLinkKey | DashboardExternalLink;

export const DASHBOARD_QUICK_LINK_MAX = 7;

export const DEFAULT_DASHBOARD_QUICK_LINKS: DashboardQuickLinkKey[] = [
  'codex',
  'sessionNotes',
  'chronology',
  'party',
  'maps',
  'threads',
  'adventures',
];

const QUICK_LINK_KEY_SET = new Set<string>(DASHBOARD_QUICK_LINK_KEYS);

export function isDashboardQuickLinkKey(value: string): value is DashboardQuickLinkKey {
  return QUICK_LINK_KEY_SET.has(value);
}

export function parseDashboardQuickLinkKeys(raw: unknown): DashboardQuickLinkKey[] | null {
  if (!Array.isArray(raw)) return null;
  const keys: DashboardQuickLinkKey[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string' || !isDashboardQuickLinkKey(entry)) return null;
    keys.push(entry);
  }
  if (keys.length > DASHBOARD_QUICK_LINK_MAX) return null;
  return keys;
}

export function normalizeDashboardQuickLinkKeys(
  raw: unknown,
): DashboardQuickLinkKey[] {
  const parsed = parseDashboardQuickLinkKeys(raw);
  if (parsed && parsed.length > 0) return parsed;
  return [...DEFAULT_DASHBOARD_QUICK_LINKS];
}

/** Navigation only. These URLs are never fetched by the server. */
export function normalizeDashboardExternalUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (value.length > 2048 || !/^https?:\/\//i.test(value) || /[\u0000-\u001f\u007f<>\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.href.length <= 2048 ? url.href : null;
  } catch { return null; }
}

export function parseDashboardQuickLinks(raw: unknown): DashboardQuickLinkEntry[] | null {
  if (!Array.isArray(raw) || raw.length > DASHBOARD_QUICK_LINK_MAX) return null;
  const entries: DashboardQuickLinkEntry[] = [];
  const ids = new Set<string>();
  for (const value of raw) {
    if (typeof value === 'string') {
      if (!isDashboardQuickLinkKey(value)) return null;
      entries.push(value);
      continue;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const entry = value as Record<string, unknown>;
    const url = normalizeDashboardExternalUrl(entry.url);
    if (entry.kind !== 'external' || typeof entry.id !== 'string' || !/^[a-z0-9_-]{1,80}$/i.test(entry.id) || ids.has(entry.id) ||
      typeof entry.label !== 'string' || !entry.label.trim() || entry.label.trim().length > 80 || !url ||
      (entry.icon !== undefined && !DASHBOARD_EXTERNAL_LINK_ICONS.includes(entry.icon as DashboardExternalLinkIcon))) return null;
    ids.add(entry.id);
    entries.push({ kind: 'external', id: entry.id, label: entry.label.trim(), url,
      ...(entry.icon ? { icon: entry.icon as DashboardExternalLinkIcon } : {}) });
  }
  return entries;
}

export function normalizeDashboardQuickLinks(raw: unknown): DashboardQuickLinkEntry[] {
  const parsed = parseDashboardQuickLinks(raw);
  if (parsed) return parsed;
  // Preserve safe entries from damaged saved configurations without making an
  // unsafe URL clickable. New writes are rejected instead of silently repaired.
  if (Array.isArray(raw)) {
    const ids = new Set<string>();
    return raw.flatMap(entry => parseDashboardQuickLinks([entry]) ?? []).filter(entry => {
      if (typeof entry === 'string') return true;
      if (ids.has(entry.id)) return false;
      ids.add(entry.id);
      return true;
    }).slice(0, DASHBOARD_QUICK_LINK_MAX);
  }
  return [...DEFAULT_DASHBOARD_QUICK_LINKS];
}

export function sanitizeQuickUtilityNavConfig(
  config: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const links = normalizeDashboardQuickLinks(config?.links);
  return { ...config, links };
}
