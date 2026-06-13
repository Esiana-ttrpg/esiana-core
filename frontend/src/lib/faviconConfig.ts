export const DEFAULT_FAVICON = '/favicon.svg';

export const DEFAULT_LOGO = '/logo.svg';

/** Recommended square dimension for tab favicons (ICO/PNG). */
export const FAVICON_RECOMMENDED_SIZE_PX = 32;

/** Maximum square dimension browsers reasonably use for favicons. */
export const FAVICON_MAX_DIMENSION_PX = 256;

/** Maximum favicon file size when self-hosting (kilobytes). */
export const FAVICON_MAX_FILE_SIZE_KB = 256;

export const FAVICON_MAX_FILE_SIZE_BYTES = FAVICON_MAX_FILE_SIZE_KB * 1024;

export const FAVICON_ALLOWED_EXTENSIONS = [
  '.ico',
  '.png',
  '.svg',
  '.webp',
  '.gif',
] as const;

export function faviconConstraintsHelpText(): string {
  return (
    `Recommended ${FAVICON_RECOMMENDED_SIZE_PX}×${FAVICON_RECOMMENDED_SIZE_PX} px ` +
    `(max ${FAVICON_MAX_DIMENSION_PX}×${FAVICON_MAX_DIMENSION_PX} px). ` +
    `Max file size ${FAVICON_MAX_FILE_SIZE_KB} KB. ` +
    `Allowed types: ${FAVICON_ALLOWED_EXTENSIONS.join(', ')}.`
  );
}
