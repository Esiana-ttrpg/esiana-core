/** Recommended square dimension for tab favicons (ICO/PNG). */
export const FAVICON_RECOMMENDED_SIZE_PX = 32;

/** Maximum square dimension browsers reasonably use for favicons. */
export const FAVICON_MAX_DIMENSION_PX = 256;

/** Maximum favicon file size when self-hosting (bytes). */
export const FAVICON_MAX_FILE_SIZE_KB = 256;

export const FAVICON_MAX_FILE_SIZE_BYTES = FAVICON_MAX_FILE_SIZE_KB * 1024;

export const FAVICON_ALLOWED_EXTENSIONS = [
  '.ico',
  '.png',
  '.svg',
  '.webp',
  '.gif',
] as const;

export type FaviconExtension = (typeof FAVICON_ALLOWED_EXTENSIONS)[number];

export function getFaviconExtensionFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    for (const ext of FAVICON_ALLOWED_EXTENSIONS) {
      if (pathname.endsWith(ext)) return ext;
    }
    return null;
  } catch {
    const lower = url.toLowerCase().split('?')[0] ?? '';
    for (const ext of FAVICON_ALLOWED_EXTENSIONS) {
      if (lower.endsWith(ext)) return ext;
    }
    return null;
  }
}

export function isAllowedFaviconUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true;
  return getFaviconExtensionFromUrl(trimmed) !== null;
}

export function faviconConstraintsHelpText(): string {
  return (
    `Recommended ${FAVICON_RECOMMENDED_SIZE_PX}×${FAVICON_RECOMMENDED_SIZE_PX} px ` +
    `(max ${FAVICON_MAX_DIMENSION_PX}×${FAVICON_MAX_DIMENSION_PX} px). ` +
    `Max file size ${FAVICON_MAX_FILE_SIZE_KB} KB. ` +
    `Allowed types: ${FAVICON_ALLOWED_EXTENSIONS.join(', ')}.`
  );
}
