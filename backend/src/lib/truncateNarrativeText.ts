const DEFAULT_MAX = 120;

/** Extract first sentence and cap length for hub presentation. */
export function extractFirstSentence(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  const trimmed = text.trim();
  const match = trimmed.match(/^[^.!?]+[.!?]?/);
  const sentence = (match?.[0] ?? trimmed).trim();
  return sentence || null;
}

export function truncateTensionLine(
  text: string | null | undefined,
  maxChars = DEFAULT_MAX,
): string | null {
  const sentence = extractFirstSentence(text);
  if (!sentence) return null;
  if (sentence.length <= maxChars) return sentence;
  const cut = sentence.slice(0, maxChars - 1).trimEnd();
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base}…`;
}
