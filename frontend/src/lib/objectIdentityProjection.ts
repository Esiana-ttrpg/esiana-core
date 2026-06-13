import { parseObjectMetadata } from '@/lib/objectMetadata';
import {
  findCodexProjectionPage,
  type CodexIdentityProjection,
} from '@/lib/codexIdentityProjection';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';

export type ObjectIdentityProjection = CodexIdentityProjection;

export function buildObjectIdentityProjection(
  pageId: string,
  flatPages: readonly WikiPageLineageSnapshot[],
): ObjectIdentityProjection | null {
  const page = findCodexProjectionPage(flatPages, pageId);
  if (!page) return null;

  const object = parseObjectMetadata(page.metadata);
  const lineParts: string[] = [];
  if (object.objectType) lineParts.push(object.objectType);
  if (object.investedOrMagical) lineParts.push(object.investedOrMagical);

  return {
    displayName: page.title,
    identityLine: lineParts.join(' • '),
    knownFor: object.knownFor,
    portraitUrl: object.appearance.portraitUrl,
  };
}
