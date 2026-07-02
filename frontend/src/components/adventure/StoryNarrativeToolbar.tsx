export {
  StoryNarrativeFilterPanel,
} from '@/components/adventure/StoryNarrativeFilterPanel';

export function matchesStoryRecentFilter(
  updatedAt: string | undefined,
  recent: boolean | undefined,
): boolean {
  if (!recent) return true;
  if (!updatedAt) return false;
  const days = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return days <= 14;
}

export function matchesStorySearchQuery(
  query: string | undefined,
  ...fields: Array<string | null | undefined>
): boolean {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => (field ?? '').toLowerCase().includes(q));
}
