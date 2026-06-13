export const VALID_FOOTER_ALIGNMENTS = ['left', 'center', 'right'] as const;

export type FooterAlignment = (typeof VALID_FOOTER_ALIGNMENTS)[number];

export function sanitizeFooterAlignment(
  value: string | null | undefined,
): FooterAlignment | null {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return null;
  return VALID_FOOTER_ALIGNMENTS.includes(normalized as FooterAlignment)
    ? (normalized as FooterAlignment)
    : null;
}
