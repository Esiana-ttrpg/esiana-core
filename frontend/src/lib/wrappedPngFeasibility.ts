/**
 * Pass 2 PNG feasibility helpers — used by Pass 3 export and documented in
 * docs/wrapped-png-feasibility.md.
 *
 * Export trees must never load restricted or cross-origin campaign artwork.
 */

export const WRAPPED_EXPORT_WIDTH = 1080;
export const WRAPPED_EXPORT_HEIGHT = 1920;

/** True when artwork must be omitted from the share-safe export tree. */
export function isRemoteCampaignArtworkUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    // Absolute http(s) URLs are never loaded into the export tree.
    if (/^https?:\/\//i.test(url)) return true;
    if (typeof window === 'undefined') return true;
    const parsed = new URL(url, window.location.origin);
    return parsed.origin !== window.location.origin;
  } catch {
    return true;
  }
}

/**
 * Share-safe export must use themed fallbacks only when artwork is remote or
 * unauthorized. Returns null to force CSS fallback.
 */
export function shareSafeArtworkUrl(
  url: string | null | undefined,
  authorized: boolean,
): string | null {
  if (!authorized || !url) return null;
  if (isRemoteCampaignArtworkUrl(url)) return null;
  return url;
}

const FONT_READY_TIMEOUT_MS = 1500;

export async function waitForDocumentFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts?.ready) return;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, FONT_READY_TIMEOUT_MS);
      }),
    ]);
  } catch {
    // Font readiness is best-effort for export fidelity.
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
