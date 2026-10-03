import type { AggregateDetectedEntity } from '@/types/wiki';
import { campaignWikiPath } from '@/lib/campaignPaths';

/**
 * Insert presentation-only markdown links for detected entities.
 * Does not mutate source notes — returns a display string for the passage slice.
 * Offsets on detections are absolute to the full note markdown.
 */
export function enrichPassageMarkdownForDisplay(input: {
  fullMarkdown: string;
  start: number;
  end: number;
  detectedEntities: AggregateDetectedEntity[];
  campaignHandle: string;
}): string {
  const slice = input.fullMarkdown.slice(input.start, input.end);
  const relative = input.detectedEntities
    .filter((d) => d.start >= input.start && d.end <= input.end)
    .map((d) => ({
      start: d.start - input.start,
      end: d.end - input.start,
      pageId: d.pageId,
    }))
    .sort((a, b) => b.start - a.start);

  let result = slice;
  for (const hit of relative) {
    const label = slice.slice(hit.start, hit.end);
    if (!label) continue;
    const before = slice.slice(Math.max(0, hit.start - 2), hit.start);
    const after = slice.slice(hit.end, hit.end + 2);
    if (before.includes('[') || after.startsWith('](') || before.includes('[[')) {
      continue;
    }
    const href = campaignWikiPath(input.campaignHandle, hit.pageId);
    result =
      result.slice(0, hit.start) +
      `[${label}](${href})` +
      result.slice(hit.end);
  }
  return result;
}

export function countWordsInPassage(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}
