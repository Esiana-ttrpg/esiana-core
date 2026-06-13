export function formatCharacterDisplayName(
  name: string,
  pronouns?: string | null,
): { primary: string; pronounSuffix: string | null; ariaLabel: string } {
  const primary = name.trim();
  const trimmed = typeof pronouns === 'string' ? pronouns.trim() : '';
  const pronounSuffix = trimmed.length > 0 ? trimmed : null;
  const ariaLabel = pronounSuffix ? `${primary}, ${pronounSuffix}` : primary;
  return { primary, pronounSuffix, ariaLabel };
}

export function truncateKnownFor(text: string, maxLength = 80): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}
