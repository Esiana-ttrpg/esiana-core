import { parseLocationMetadata } from '@/lib/locationMetadata';
import {
  findCodexProjectionPage,
  type CodexIdentityProjection,
} from '@/lib/codexIdentityProjection';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';

export type LocationIdentityProjection = CodexIdentityProjection;

export function buildLocationIdentityProjection(
  pageId: string,
  flatPages: readonly WikiPageLineageSnapshot[],
): LocationIdentityProjection | null {
  const page = findCodexProjectionPage(flatPages, pageId);
  if (!page) return null;

  const location = parseLocationMetadata(page.metadata);
  const lineParts: string[] = [];
  if (location.locationType) lineParts.push(location.locationType);
  if (location.region) lineParts.push(location.region);
  else if (location.rulerOrAuthority) lineParts.push(location.rulerOrAuthority);

  return {
    displayName: page.title,
    identityLine: lineParts.join(' • '),
    knownFor: location.knownFor,
    portraitUrl: null,
  };
}
