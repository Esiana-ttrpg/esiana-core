export const CHRONOLOGY_DESCRIPTION_PREVIEW_LIMIT = 280;

export function truncateChronologyDescription(
  description: string | null | undefined,
  limit = CHRONOLOGY_DESCRIPTION_PREVIEW_LIMIT,
): { text: string; isTruncated: boolean } | null {
  if (description == null) return null;
  const trimmed = description.trim();
  if (!trimmed) return null;
  if (trimmed.length <= limit) {
    return { text: trimmed, isTruncated: false };
  }
  return { text: trimmed.slice(0, limit), isTruncated: true };
}
