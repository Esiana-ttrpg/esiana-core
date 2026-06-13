import catalog from './tagIconCatalog.json' with { type: 'json' };

const LUCIDE_ALLOWLIST = new Set<string>(catalog as string[]);

const ICON_VALUE_RE = /^(lucide:[a-z0-9-]+|asset:[a-z0-9]+)$/;

export function parseTagIconValue(
  raw: unknown,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === null || raw === undefined) {
    return { ok: true, value: null };
  }
  if (typeof raw !== 'string') {
    return { ok: false, error: 'icon must be a string or null' };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }
  if (!ICON_VALUE_RE.test(trimmed)) {
    return { ok: false, error: 'Invalid icon format' };
  }
  if (trimmed.startsWith('lucide:')) {
    const name = trimmed.slice('lucide:'.length);
    if (!LUCIDE_ALLOWLIST.has(name)) {
      return { ok: false, error: 'Icon is not in the allowed catalog' };
    }
  }
  return { ok: true, value: trimmed };
}

export function parseTagIconAssetId(icon: string | null | undefined): string | null {
  if (!icon || !icon.startsWith('asset:')) return null;
  return icon.slice('asset:'.length) || null;
}

/** Alias for shared catalog icon validation (tags, sidebar, etc.). */
export const parseCatalogIconValue = parseTagIconValue;

export function isLucideIconAllowed(name: string): boolean {
  return LUCIDE_ALLOWLIST.has(name);
}

export { LUCIDE_ALLOWLIST };
