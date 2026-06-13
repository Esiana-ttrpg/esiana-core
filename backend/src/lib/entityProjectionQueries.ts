import {
  type ChronologyDateParts,
  type OrgRelationCategory,
  type OrgRelationStance,
  dateSortKey,
  isRelationVisibleToViewer,
} from './entityRelationTypes.js';
import {
  isCharacterAliveAt,
  parseCharacterLineageMetadata,
} from './characterLineageMetadata.js';
import {
  type OrganizationMetadataFields,
  parseOrganizationMetadata,
  resolveOrgStanceAt,
} from './organizationMetadata.js';
import { parseAncestryMetadata } from './ancestryMetadata.js';

export interface WikiPageLineageSnapshot {
  id: string;
  title: string;
  templateType: string;
  metadata: unknown;
}

export function livingMembersOfFamily(
  familyId: string,
  pages: WikiPageLineageSnapshot[],
  date: ChronologyDateParts,
  isDMUser = true,
): WikiPageLineageSnapshot[] {
  return pages.filter((page) => {
    const lineage = parseCharacterLineageMetadata(page.metadata);
    if (lineage.familyId !== familyId) return false;
    return isCharacterAliveAt(lineage, date);
  });
}

export function orgsWithStanceToward(
  targetOrgId: string,
  stance: OrgRelationStance,
  orgPages: WikiPageLineageSnapshot[],
  date: ChronologyDateParts,
  relationType?: OrgRelationCategory,
  isDMUser = true,
): Array<{ org: WikiPageLineageSnapshot; event: ReturnType<typeof resolveOrgStanceAt> }> {
  const results: Array<{
    org: WikiPageLineageSnapshot;
    event: NonNullable<ReturnType<typeof resolveOrgStanceAt>>;
  }> = [];

  for (const page of orgPages) {
    const org = parseOrganizationMetadata(page.metadata);
    for (const relation of org.relations) {
      if (relation.targetOrgId !== targetOrgId) continue;
      const event = resolveOrgStanceAt(relation, date, relationType);
      if (!event || event.stance !== stance) continue;
      if (!isRelationVisibleToViewer(event.visibility, isDMUser)) continue;
      results.push({ org: page, event });
    }
  }
  return results;
}

export function activeOrgAffiliations(
  characterMetadata: unknown,
  orgId: string,
  date: ChronologyDateParts,
  isDMUser = true,
): boolean {
  const lineage = parseCharacterLineageMetadata(characterMetadata);
  const queryKey = dateSortKey(date);
  return lineage.orgAffiliations.some((aff) => {
    if (aff.orgId !== orgId) return false;
    if (!isRelationVisibleToViewer(aff.visibility, isDMUser)) return false;
    if (aff.startDate && dateSortKey(aff.startDate) > queryKey) return false;
    if (aff.endDate && dateSortKey(aff.endDate) < queryKey) return false;
    return true;
  });
}

export function charactersInOrg(
  orgId: string,
  pages: WikiPageLineageSnapshot[],
  date: ChronologyDateParts,
  isDMUser = true,
): WikiPageLineageSnapshot[] {
  return pages.filter((page) =>
    activeOrgAffiliations(page.metadata, orgId, date, isDMUser),
  );
}

export function childOrgsOf(
  parentOrgId: string,
  orgPages: WikiPageLineageSnapshot[],
): WikiPageLineageSnapshot[] {
  return orgPages.filter((page) => {
    const org = parseOrganizationMetadata(page.metadata);
    return org.parentOrgId === parentOrgId;
  });
}

export function childLineagesOf(
  parentAncestryId: string,
  ancestryPages: WikiPageLineageSnapshot[],
): WikiPageLineageSnapshot[] {
  return ancestryPages.filter((page) => {
    const ancestry = parseAncestryMetadata(page.metadata);
    return ancestry.parentAncestryId === parentAncestryId && ancestry.entityKind === 'lineage';
  });
}

export { resolveOrgStanceAt, resolveOrgRelationsAt } from './organizationMetadata.js';
export type { OrganizationMetadataFields };
