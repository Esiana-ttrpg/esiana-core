export type HighlightSegment =
  | { type: 'text'; value: string }
  | { type: 'mark'; value: string };

/**
 * Split `text` into plain / mark segments for the first overlapping query tokens.
 * Case-insensitive; preserves original casing in the output.
 */
export function highlightMatchSegments(
  text: string,
  tokens: string[],
): HighlightSegment[] {
  if (!text) return [];
  const cleaned = tokens
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0)
    .sort((a, b) => b.length - a.length);
  if (cleaned.length === 0) return [{ type: 'text', value: text }];

  const lower = text.toLowerCase();
  const marks: Array<{ start: number; end: number }> = [];
  for (const token of cleaned) {
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(token, from);
      if (idx < 0) break;
      marks.push({ start: idx, end: idx + token.length });
      from = idx + token.length;
    }
  }
  if (marks.length === 0) return [{ type: 'text', value: text }];

  marks.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: Array<{ start: number; end: number }> = [];
  for (const mark of marks) {
    const last = merged[merged.length - 1];
    if (last && mark.start <= last.end) {
      last.end = Math.max(last.end, mark.end);
    } else {
      merged.push({ ...mark });
    }
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const mark of merged) {
    if (mark.start > cursor) {
      segments.push({ type: 'text', value: text.slice(cursor, mark.start) });
    }
    segments.push({ type: 'mark', value: text.slice(mark.start, mark.end) });
    cursor = mark.end;
  }
  if (cursor < text.length) {
    segments.push({ type: 'text', value: text.slice(cursor) });
  }
  return segments;
}
