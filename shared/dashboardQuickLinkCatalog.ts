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

export function sanitizeQuickUtilityNavConfig(
  config: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const links = normalizeDashboardQuickLinkKeys(config?.links);
  return { ...config, links };
}
