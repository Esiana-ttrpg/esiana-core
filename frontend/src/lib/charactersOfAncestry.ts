import { isCharacterEntityPage } from '@shared/resolveCanonicalEntityCategory';
import { parseCharacterMetadata } from './characterMetadata';
import { parseAncestryMetadata } from './ancestryMetadata';
import { childLineagesOf } from './ancestryInheritanceProjection';
import type { WikiTreeNode } from '@/types/wiki';

export interface CharacterAncestryRef {
  pageId: string;
  title: string;
  ancestryId: string | null;
  lineageId: string | null;
  currentLocationId: string | null;
}

function isCharacterPage(page: WikiTreeNode, flatPages: WikiTreeNode[]): boolean {
  return isCharacterEntityPage(page, flatPages);
}

export function charactersOfAncestry(
  ancestryPageId: string,
  flatPages: WikiTreeNode[],
  options?: { includeChildLineages?: boolean },
): CharacterAncestryRef[] {
  const includeChildLineages = options?.includeChildLineages ?? true;
  const lineageIds = new Set<string>([ancestryPageId]);
  if (includeChildLineages) {
    for (const lineage of childLineagesOf(ancestryPageId, flatPages)) {
      lineageIds.add(lineage.id);
    }
  }

  const results: CharacterAncestryRef[] = [];
  for (const page of flatPages) {
    if (!isCharacterPage(page, flatPages)) continue;
    const identity = parseCharacterMetadata(page.metadata);
    const matchesAncestry = identity.ancestryId === ancestryPageId;
    const matchesLineage =
      identity.lineageId != null && lineageIds.has(identity.lineageId);
    const matchesLegacy =
      !identity.ancestryId &&
      !identity.lineageId &&
      identity.ancestry?.trim().toLowerCase() === page.title.trim().toLowerCase();

    if (!matchesAncestry && !matchesLineage && !matchesLegacy) continue;

    results.push({
      pageId: page.id,
      title: page.title,
      ancestryId: identity.ancestryId,
      lineageId: identity.lineageId,
      currentLocationId: identity.currentLocationId,
    });
  }

  return results.sort((a, b) => a.title.localeCompare(b.title));
}

export function resolveCharacterAncestryFromPages(
  identity: ReturnType<typeof parseCharacterMetadata>,
  flatPages: WikiTreeNode[],
): { ancestryId: string | null; lineageId: string | null } {
  if (identity.ancestryId || identity.lineageId) {
    return { ancestryId: identity.ancestryId, lineageId: identity.lineageId };
  }
  const legacy = identity.ancestry?.trim();
  if (!legacy) return { ancestryId: null, lineageId: null };

  const match = flatPages.find(
    (p) => p.title.trim().toLowerCase() === legacy.toLowerCase(),
  );
  if (!match) return { ancestryId: null, lineageId: null };

  const meta = parseAncestryMetadata(match.metadata);
  if (meta.entityKind === 'lineage') {
    return { ancestryId: meta.parentAncestryId, lineageId: match.id };
  }
  return { ancestryId: match.id, lineageId: null };
}

export function campaignCharacterLocationIds(
  characters: CharacterAncestryRef[],
): string[] {
  const ids = new Set<string>();
  for (const character of characters) {
    if (character.currentLocationId) ids.add(character.currentLocationId);
  }
  return [...ids];
}
