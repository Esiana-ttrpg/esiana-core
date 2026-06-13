/**
 * Platform invariant (Phase 2): structured image fields store `/api/assets/{id}` only.
 */

export const ASSET_REFERENCE_PREFIX = '/api/assets/';

export const ASSET_REFERENCE_VALIDATION_MESSAGE =
  'Image URLs must be imported as campaign assets. Use Import Image URL instead.';

export class AssetReferenceError extends Error {
  constructor(message: string = ASSET_REFERENCE_VALIDATION_MESSAGE) {
    super(message);
    this.name = 'AssetReferenceError';
  }
}

const ASSET_REFERENCE_PATTERN = /^\/api\/assets\/([^/?#]+)$/;

export function parseAssetReferenceId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(ASSET_REFERENCE_PATTERN);
  return match?.[1] ?? null;
}

export function isAssetReferenceUrl(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  return parseAssetReferenceId(raw) !== null;
}

/** Lenient: invalid or empty values become null (read paths, projection). */
export function coerceAssetReferenceUrl(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const id = parseAssetReferenceId(trimmed);
  if (!id) return null;
  return `${ASSET_REFERENCE_PREFIX}${id}`;
}

/** Strict: empty → null; valid reference → canonical url; invalid → throw. */
export function normalizeAssetReferenceUrl(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== 'string') {
    throw new AssetReferenceError();
  }
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const id = parseAssetReferenceId(trimmed);
  if (!id) {
    throw new AssetReferenceError();
  }
  return `${ASSET_REFERENCE_PREFIX}${id}`;
}

export function assertAssetReferenceUrl(raw: unknown): void {
  normalizeAssetReferenceUrl(raw);
}

export function validateImageDisplayBlockContent(
  content: unknown,
): void {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return;
  const imageUrl = (content as Record<string, unknown>).imageUrl;
  if (imageUrl == null || imageUrl === '') return;
  normalizeAssetReferenceUrl(imageUrl);
}

export function validateWikiBlocksAssetReferences(
  blocks: unknown,
): void {
  if (!Array.isArray(blocks)) return;
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;
    const row = block as Record<string, unknown>;
    if (row.type !== 'image-display') continue;
    validateImageDisplayBlockContent(row.content);
  }
}

export function validateAppearanceAssetReferences(raw: unknown): void {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
  const obj = raw as Record<string, unknown>;
  if (
    'portraitUrl' in obj &&
    obj.portraitUrl != null &&
    obj.portraitUrl !== ''
  ) {
    normalizeAssetReferenceUrl(obj.portraitUrl);
  }
  const gallery = obj.gallery;
  if (!gallery || typeof gallery !== 'object' || Array.isArray(gallery)) return;
  const entries = (gallery as { entries?: unknown }).entries;
  if (!Array.isArray(entries)) return;
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const imageUrl = (entry as { imageUrl?: unknown }).imageUrl;
    if (imageUrl != null && imageUrl !== '') {
      normalizeAssetReferenceUrl(imageUrl);
    }
  }
}

export function validateHeroCoverImageSave(raw: unknown): void {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
  const coverImageUrl = (raw as { coverImageUrl?: unknown }).coverImageUrl;
  if (coverImageUrl == null || coverImageUrl === '') return;
  normalizeAssetReferenceUrl(coverImageUrl);
}

export function validateEnsembleBannerImageSave(raw: unknown): void {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
  const bannerImageUrl = (raw as { bannerImageUrl?: unknown }).bannerImageUrl;
  if (bannerImageUrl == null || bannerImageUrl === '') return;
  normalizeAssetReferenceUrl(bannerImageUrl);
}
