/** Read a claim by dotted path from a nested claims object. */
export function getClaimByPath(
  claims: Record<string, unknown>,
  path: string,
): unknown {
  const segments = path.split('.').filter(Boolean);
  let current: unknown = claims;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** Normalize IdP group claim values to a string array. */
export function normalizeGroupsClaimValue(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'number') return String(item);
        if (item && typeof item === 'object' && 'id' in item) {
          const id = (item as { id?: unknown }).id;
          return typeof id === 'string' ? id.trim() : '';
        }
        return '';
      })
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return normalizeGroupsClaimValue(parsed);
      } catch {
        // fall through
      }
    }
    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    }
    return [trimmed];
  }
  return [];
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.includes('@') ? trimmed : null;
}
