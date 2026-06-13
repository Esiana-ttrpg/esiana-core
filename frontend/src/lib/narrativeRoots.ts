import type { WikiTreeNode } from '@/types/wiki';

const SYSTEM_CATEGORY_KEY = 'systemCategoryKey';

function parseSystemCategoryKey(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = (metadata as Record<string, unknown>)[SYSTEM_CATEGORY_KEY];
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

export function resolveNarrativeRootId(
  flatPages: WikiTreeNode[],
  hint: 'quests' | 'scenes' | 'threads',
): string | null {
  const keyByHint = {
    quests: 'quests',
    scenes: 'narrative_scenes',
    threads: 'narrative_threads',
  } as const;

  const byKey = flatPages.find(
    (p) => parseSystemCategoryKey(p.metadata) === keyByHint[hint],
  );
  if (byKey) return byKey.id;

  if (hint === 'quests') {
    return flatPages.find((p) => p.title === 'Quests')?.id ?? null;
  }
  if (hint === 'scenes') {
    return flatPages.find((p) => p.title === 'Scenes')?.id ?? null;
  }
  return (
    flatPages.find((p) => p.title === 'Threads' || p.title === 'Narrative Threads')?.id ??
    null
  );
}
