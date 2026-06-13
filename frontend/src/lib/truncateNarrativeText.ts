const DEFAULT_MAX = 120;

export function truncateTensionLine(
  text: string | null | undefined,
  maxChars = DEFAULT_MAX,
): string | null {
  if (!text?.trim()) return null;
  const trimmed = text.trim();
  const sentenceMatch = trimmed.match(/^[^.!?]+[.!?]?/);
  const sentence = (sentenceMatch?.[0] ?? trimmed).trim();
  if (sentence.length <= maxChars) return sentence;
  const cut = sentence.slice(0, maxChars - 1).trimEnd();
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base}…`;
}
