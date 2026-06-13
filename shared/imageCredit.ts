export interface ImageCredit {
  artCredit?: string | null;
  artCreditUrl?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  madeWith?: string | null;
  madeWithUrl?: string | null;
}

export type ImageCreditDisplayRow = {
  label: 'Art credit' | 'Source' | 'Made with';
  text: string;
  href?: string;
};

export const IMAGE_CREDIT_DISCLAIMER =
  'Credits are optional and may not always reflect ownership or reuse rights.';

export const MADE_WITH_SUGGESTIONS = [
  'HeroForge',
  'Picrew',
  'Rinmaru',
  'DungeonDraft',
  'Inkarnate',
  'Wonderdraft',
  'Midjourney',
  'SDXL',
  "Baldur's Gate 3 character creator",
] as const;

function trimText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCreditUrl(raw: unknown): string | null {
  const text = trimText(raw);
  if (!text) return null;
  if (text.startsWith('http://') || text.startsWith('https://')) return text;
  return null;
}

export function normalizeImageCredit(raw: unknown): ImageCredit | null {
  if (raw === null || raw === undefined) return null;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const obj = raw as Record<string, unknown>;
  const artCredit = trimText(obj.artCredit);
  const source = trimText(obj.source);
  const madeWith = trimText(obj.madeWith);

  const artCreditUrl = artCredit ? normalizeCreditUrl(obj.artCreditUrl) : null;
  const sourceUrl = source ? normalizeCreditUrl(obj.sourceUrl) : null;
  const madeWithUrl = madeWith ? normalizeCreditUrl(obj.madeWithUrl) : null;

  if (!artCredit && !source && !madeWith) return null;

  return {
    artCredit,
    artCreditUrl,
    source,
    sourceUrl,
    madeWith,
    madeWithUrl,
  };
}

export function imageCreditDisplayRows(
  credit: ImageCredit | null | undefined,
): ImageCreditDisplayRow[] {
  const normalized = credit ? normalizeImageCredit(credit) : null;
  if (!normalized) return [];

  const rows: ImageCreditDisplayRow[] = [];

  if (normalized.artCredit) {
    rows.push({
      label: 'Art credit',
      text: normalized.artCredit,
      href: normalized.artCreditUrl ?? undefined,
    });
  }
  if (normalized.source) {
    rows.push({
      label: 'Source',
      text: normalized.source,
      href: normalized.sourceUrl ?? undefined,
    });
  }
  if (normalized.madeWith) {
    rows.push({
      label: 'Made with',
      text: normalized.madeWith,
      href: normalized.madeWithUrl ?? undefined,
    });
  }

  return rows;
}

export function hasImageCredit(credit: ImageCredit | null | undefined): boolean {
  return imageCreditDisplayRows(credit).length > 0;
}
