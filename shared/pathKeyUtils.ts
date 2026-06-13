/**
 * Workspace-scoped public path keys (derived from titles, not global slugs).
 */

export function normalizePathKey(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return '';

  let key = trimmed
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  key = key.replace(/[^a-z0-9]+$/g, '').replace(/-+$/g, '');
  return key;
}

/** Lenient path key from a wiki page title. */
export function pathKeyFromTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return '';

  const strict = trimmed
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (strict.length >= 1 && strict.length <= 80) {
    return strict;
  }

  return normalizePathKey(trimmed);
}

export function isPathKeyReserved(
  pathKey: string,
  reserved: ReadonlySet<string>,
): boolean {
  if (!pathKey) return true;
  return reserved.has(pathKey);
}

/**
 * Generate a unique pathKey within a workspace from a title.
 * Appends -2, -3, … on collision.
 */
export function generatePathKeyFromTitle(
  title: string,
  taken: ReadonlySet<string>,
  reserved: ReadonlySet<string> = new Set(),
): string {
  const base = pathKeyFromTitle(title) || 'untitled';
  if (!taken.has(base) && !isPathKeyReserved(base, reserved)) {
    return base;
  }

  for (let n = 2; n < 10_000; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate) && !isPathKeyReserved(candidate, reserved)) {
      return candidate;
    }
  }

  return `${base}-${Date.now()}`;
}

/** Recompute pathKey when title changes; keeps current key if still unique. */
export function syncPathKeyOnRename(
  currentPathKey: string | null | undefined,
  newTitle: string,
  taken: ReadonlySet<string>,
  reserved: ReadonlySet<string> = new Set(),
): string {
  const nextBase = pathKeyFromTitle(newTitle) || 'untitled';
  if (currentPathKey === nextBase) return nextBase;

  const others = new Set(taken);
  if (currentPathKey) others.delete(currentPathKey);

  if (!others.has(nextBase) && !isPathKeyReserved(nextBase, reserved)) {
    return nextBase;
  }

  return generatePathKeyFromTitle(newTitle, others, reserved);
}
