import { parseFamilyMetadata } from '@/lib/familyMetadata';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';

export interface FamilyIdentityProjection {
  displayName: string;
  subtitle: string | null;
  identityLine: string;
  knownFor: string | null;
  emblemUrl: string | null;
}

function findPage(
  flatPages: readonly WikiPageLineageSnapshot[],
  pageId: string,
): WikiPageLineageSnapshot | null {
  return flatPages.find((page) => page.id === pageId) ?? null;
}

function resolveTitle(
  flatPages: readonly WikiPageLineageSnapshot[],
  pageId: string | null | undefined,
): string | null {
  if (!pageId) return null;
  return findPage(flatPages, pageId)?.title ?? null;
}

export function buildFamilyIdentityProjection(
  pageId: string,
  flatPages: readonly WikiPageLineageSnapshot[],
): FamilyIdentityProjection | null {
  const page = findPage(flatPages, pageId);
  if (!page) return null;

  const family = parseFamilyMetadata(page.metadata);
  const seatTitle = resolveTitle(flatPages, family.seatLocationId);

  const lineParts: string[] = [];
  if (family.familyType) lineParts.push(family.familyType);
  if (seatTitle) lineParts.push(seatTitle);
  else if (family.region) lineParts.push(family.region);
  if (family.status) lineParts.push(family.status);

  return {
    displayName: page.title,
    subtitle: family.houseBranch,
    identityLine: lineParts.join(' • '),
    knownFor: family.coatOfArms,
    emblemUrl: family.coatOfArms,
  };
}
