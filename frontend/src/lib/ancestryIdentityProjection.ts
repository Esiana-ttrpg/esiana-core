import { parseAncestryMetadata, ANCESTRY_ENTITY_KIND_LABELS } from '@/lib/ancestryMetadata';
import { formatPresenceExcerpt, buildAncestryPresenceProjection } from '@/lib/ancestryPresenceProjection';
import {
  findCodexProjectionPage,
  type CodexIdentityProjection,
} from '@/lib/codexIdentityProjection';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';

export type AncestryIdentityProjection = CodexIdentityProjection & {
  entityKind: string;
  identitySummary: string | null;
  parentTitle: string | null;
  presenceExcerpt: string | null;
};

export function buildAncestryIdentityProjection(
  pageId: string,
  flatPages: readonly WikiPageLineageSnapshot[],
): AncestryIdentityProjection | null {
  const page = findCodexProjectionPage(flatPages, pageId);
  if (!page) return null;

  const ancestry = parseAncestryMetadata(page.metadata);
  const lineParts: string[] = [];
  if (ancestry.entityKind !== 'root') {
    lineParts.push(ANCESTRY_ENTITY_KIND_LABELS[ancestry.entityKind]);
  }
  if (ancestry.ancestryType) lineParts.push(ancestry.ancestryType);
  const presenceExcerpt = formatPresenceExcerpt(
    buildAncestryPresenceProjection(
      pageId,
      flatPages as unknown as import('./ancestryInheritanceProjection').AncestryPageRef[],
    ),
  );
  if (presenceExcerpt) lineParts.push(presenceExcerpt);
  else if (ancestry.homeland) lineParts.push(ancestry.homeland);
  else if (ancestry.region) lineParts.push(ancestry.region);

  const parentTitle = ancestry.parentAncestryId
    ? flatPages.find((p) => p.id === ancestry.parentAncestryId)?.title ?? null
    : null;

  return {
    displayName: page.title,
    identityLine: lineParts.join(' • '),
    knownFor: ancestry.knownFor ?? ancestry.identitySummary,
    portraitUrl: ancestry.appearance.portraitUrl,
    entityKind: ANCESTRY_ENTITY_KIND_LABELS[ancestry.entityKind],
    identitySummary: ancestry.identitySummary,
    parentTitle,
    presenceExcerpt,
  };
}
