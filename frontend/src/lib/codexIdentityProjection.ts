import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';

export interface CodexIdentityProjection {
  displayName: string;
  identityLine: string;
  knownFor: string | null;
  portraitUrl: string | null;
}

export function findCodexProjectionPage(
  flatPages: readonly WikiPageLineageSnapshot[],
  pageId: string,
): WikiPageLineageSnapshot | null {
  return flatPages.find((page) => page.id === pageId) ?? null;
}
