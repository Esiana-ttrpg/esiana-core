import {
  type ChronologyDateParts,
  type OrgRelationCategory,
  type OrgRelationStance,
  dateSortKey,
  isRelationVisibleToViewer,
} from './entityRelationTypes';
import {
  isCharacterAliveAt,
  parseCharacterLineageMetadata,
} from './characterLineageMetadata';
import { parseFamilyMetadata } from './familyMetadata';
import {
  type OrganizationMetadataFields,
  parseOrganizationMetadata,
  resolveOrgStanceAt,
} from './organizationMetadata';
import { parseAncestryMetadata } from './ancestryMetadata';
import { buildProjectionProvenance, type ProjectionProvenance } from './projectionProvenance';

export interface WikiPageLineageSnapshot {
  id: string;
  title: string;
  templateType: string;
  metadata: unknown;
}

const TENSION_STANCES: OrgRelationStance[] = ['HOSTILE', 'SECRET_HOSTILE', 'VASSAL'];

export interface EntityRelationshipProjection {
  affiliations: Array<
    {
      org: WikiPageLineageSnapshot;
      role: string | null;
      startDate: ChronologyDateParts | null;
      endDate: ChronologyDateParts | null;
    } & ProjectionProvenance
  >;
  bloodlineRoots: Array<
    {
      character: WikiPageLineageSnapshot;
      relationshipType: string;
    } & ProjectionProvenance
  >;
  diplomaticTensions: Array<
    {
      org: WikiPageLineageSnapshot;
      stance: OrgRelationStance;
      direction: 'outgoing' | 'incoming';
      note?: string;
    } & ProjectionProvenance
  >;
  resolvedFromDate: ChronologyDateParts;
  /** Populated from entity graph hydrate when server projection is available */
  narrativeStatusByPageId?: Record<string, string>;
}

function snapshotCopy(page: WikiPageLineageSnapshot): WikiPageLineageSnapshot {
  return {
    id: page.id,
    title: page.title,
    templateType: page.templateType,
    metadata: page.metadata,
  };
}

function sortSnapshots(pages: WikiPageLineageSnapshot[]): WikiPageLineageSnapshot[] {
  return [...pages].sort((a, b) => a.title.localeCompare(b.title));
}

function characterAffiliationsAt(
  page: WikiPageLineageSnapshot,
  flatPages: readonly WikiPageLineageSnapshot[],
  date: ChronologyDateParts,
  isDMUser: boolean,
): EntityRelationshipProjection['affiliations'] {
  const lineage = parseCharacterLineageMetadata(page.metadata);
  const queryKey = dateSortKey(date);
  const pageById = new Map(flatPages.map((p) => [p.id, p]));
  const rows: EntityRelationshipProjection['affiliations'] = [];

  for (const aff of lineage.orgAffiliations) {
    if (!isRelationVisibleToViewer(aff.visibility, isDMUser)) continue;
    if (aff.startDate && dateSortKey(aff.startDate) > queryKey) continue;
    if (aff.endDate && dateSortKey(aff.endDate) < queryKey) continue;
    const org = pageById.get(aff.orgId);
    if (!org) continue;
    rows.push({
      org: snapshotCopy(org),
      role: aff.role,
      startDate: aff.startDate ? { ...aff.startDate } : null,
      endDate: aff.endDate ? { ...aff.endDate } : null,
      ...buildProjectionProvenance({
        relationIds: [aff.id],
        resolvedFromDate: date,
      }),
    });
  }

  return rows.sort((a, b) => a.org.title.localeCompare(b.org.title));
}

function characterBloodlineRoots(
  page: WikiPageLineageSnapshot,
  flatPages: readonly WikiPageLineageSnapshot[],
  date: ChronologyDateParts,
  isDMUser: boolean,
): EntityRelationshipProjection['bloodlineRoots'] {
  const lineage = parseCharacterLineageMetadata(page.metadata);
  const pageById = new Map(flatPages.map((p) => [p.id, p]));
  const rows: EntityRelationshipProjection['bloodlineRoots'] = [];

  for (const link of lineage.parentLinks) {
    if (!isRelationVisibleToViewer(link.visibility, isDMUser)) continue;
    if (!link.isPublic && !isDMUser) continue;
    const parent = pageById.get(link.targetCharacterId);
    if (!parent) continue;
    rows.push({
      character: snapshotCopy(parent),
      relationshipType: link.relationshipType,
      ...buildProjectionProvenance({
        lineageIds: [link.id],
        resolvedFromDate: date,
      }),
    });
  }

  return rows.sort((a, b) => a.character.title.localeCompare(b.character.title));
}

function familyBloodlineRoots(
  familyPageId: string,
  familyMetadata: unknown,
  characterPages: readonly WikiPageLineageSnapshot[],
  date: ChronologyDateParts,
  isDMUser: boolean,
): EntityRelationshipProjection['bloodlineRoots'] {
  const family = parseFamilyMetadata(familyMetadata);
  const familyMembers = characterPages.filter((page) => {
    const lineage = parseCharacterLineageMetadata(page.metadata);
    return lineage.familyId === familyPageId;
  });
  const memberIds = new Set(familyMembers.map((m) => m.id));
  const rows: EntityRelationshipProjection['bloodlineRoots'] = [];
  const seen = new Set<string>();

  function addRoot(
    character: WikiPageLineageSnapshot,
    relationshipType: string,
    lineageIds: string[],
  ) {
    if (seen.has(character.id)) return;
    seen.add(character.id);
    rows.push({
      character: snapshotCopy(character),
      relationshipType,
      ...buildProjectionProvenance({ lineageIds, resolvedFromDate: date }),
    });
  }

  if (family.headCharacterId) {
    const head = characterPages.find((m) => m.id === family.headCharacterId);
    if (head) addRoot(head, 'HEAD', []);
  }

  for (const member of familyMembers) {
    const lineage = parseCharacterLineageMetadata(member.metadata);
    if (lineage.lineageRole === 'HEAD') {
      addRoot(member, 'HEAD', []);
      continue;
    }
    const visibleParents = lineage.parentLinks.filter(
      (link) =>
        isRelationVisibleToViewer(link.visibility, isDMUser) &&
        (link.isPublic || isDMUser) &&
        memberIds.has(link.targetCharacterId),
    );
    if (visibleParents.length === 0) {
      addRoot(member, lineage.lineageRole ?? 'ROOT', []);
    }
  }

  return rows.sort((a, b) => a.character.title.localeCompare(b.character.title));
}

export function orgDiplomaticTensions(
  orgPage: WikiPageLineageSnapshot,
  orgPages: readonly WikiPageLineageSnapshot[],
  date: ChronologyDateParts,
  isDMUser: boolean,
): EntityRelationshipProjection['diplomaticTensions'] {
  const org = parseOrganizationMetadata(orgPage.metadata);
  const pageById = new Map(orgPages.map((p) => [p.id, p]));
  const rows: EntityRelationshipProjection['diplomaticTensions'] = [];

  for (const relation of org.relations) {
    const event = resolveOrgStanceAt(relation, date);
    if (!event) continue;
    if (!TENSION_STANCES.includes(event.stance)) continue;
    if (!isRelationVisibleToViewer(event.visibility, isDMUser)) continue;
    const target = pageById.get(relation.targetOrgId);
    if (!target) continue;
    rows.push({
      org: snapshotCopy(target),
      stance: event.stance,
      direction: 'outgoing',
      note: event.note ?? undefined,
      ...buildProjectionProvenance({
        relationIds: [relation.id, event.id],
        resolvedFromDate: date,
      }),
    });
  }

  for (const stance of ['HOSTILE', 'SECRET_HOSTILE'] as const) {
    const incoming = orgsWithStanceToward(
      orgPage.id,
      stance,
      [...orgPages],
      date,
      undefined,
      isDMUser,
    );
    for (const { org: sourceOrg, relation, event } of incoming) {
      if (sourceOrg.id === orgPage.id) continue;
      if (rows.some((r) => r.org.id === sourceOrg.id && r.direction === 'incoming')) continue;
      rows.push({
        org: snapshotCopy(sourceOrg),
        stance: event.stance,
        direction: 'incoming',
        note: event.note ?? undefined,
        ...buildProjectionProvenance({
          relationIds: [relation.id, event.id],
          resolvedFromDate: date,
        }),
      });
    }
  }

  return rows.sort((a, b) => {
    const dir = a.direction.localeCompare(b.direction);
    if (dir !== 0) return dir;
    return a.org.title.localeCompare(b.org.title);
  });
}

/** Pure, deterministic, side-effect free */
export function buildEntityRelationshipProjection(
  pageId: string,
  templateType: string,
  flatPages: readonly WikiPageLineageSnapshot[],
  date: ChronologyDateParts,
  isDMUser: boolean,
): EntityRelationshipProjection {
  const resolvedFromDate: ChronologyDateParts = {
    year: date.year,
    month: date.month,
    day: date.day,
  };

  const empty: EntityRelationshipProjection = {
    affiliations: [],
    bloodlineRoots: [],
    diplomaticTensions: [],
    resolvedFromDate,
    narrativeStatusByPageId: {},
  };

  const page = flatPages.find((p) => p.id === pageId);
  if (!page) return empty;

  const characterPages = sortSnapshots(
    flatPages.filter((p) => p.templateType === 'CHARACTER'),
  );
  const orgPages = sortSnapshots(
    flatPages.filter((p) => p.templateType === 'ORGANIZATION'),
  );

  if (templateType === 'CHARACTER') {
    return {
      affiliations: characterAffiliationsAt(page, flatPages, date, isDMUser),
      bloodlineRoots: characterBloodlineRoots(page, flatPages, date, isDMUser),
      diplomaticTensions: [],
      resolvedFromDate,
    };
  }

  if (templateType === 'FAMILY') {
    return {
      affiliations: [],
      bloodlineRoots: familyBloodlineRoots(
        pageId,
        page.metadata,
        characterPages,
        date,
        isDMUser,
      ),
      diplomaticTensions: [],
      resolvedFromDate,
    };
  }

  if (templateType === 'ORGANIZATION') {
    return {
      affiliations: [],
      bloodlineRoots: [],
      diplomaticTensions: orgDiplomaticTensions(page, orgPages, date, isDMUser),
      resolvedFromDate,
    };
  }

  return empty;
}

export function livingMembersOfFamily(
  familyId: string,
  pages: WikiPageLineageSnapshot[],
  date: ChronologyDateParts,
  _isDMUser = true,
): WikiPageLineageSnapshot[] {
  return pages.filter((page) => {
    const lineage = parseCharacterLineageMetadata(page.metadata);
    if (lineage.familyId !== familyId) return false;
    return isCharacterAliveAt(lineage, date);
  });
}

/** Living members by familyId link plus the designated head when alive at `date`. */
export function familyLivingMembers(
  familyPageId: string,
  familyMetadata: unknown,
  pages: WikiPageLineageSnapshot[],
  date: ChronologyDateParts,
): WikiPageLineageSnapshot[] {
  const living = livingMembersOfFamily(familyPageId, pages, date);
  const seen = new Set(living.map((member) => member.id));
  const family = parseFamilyMetadata(familyMetadata);

  if (family.headCharacterId && !seen.has(family.headCharacterId)) {
    const head = pages.find((page) => page.id === family.headCharacterId);
    if (head) {
      const lineage = parseCharacterLineageMetadata(head.metadata);
      if (isCharacterAliveAt(lineage, date)) {
        living.push(head);
      }
    }
  }

  return [...living].sort((a, b) => a.title.localeCompare(b.title));
}

/** All members linked by familyId plus the designated head character page. */
export function familyMemberSnapshots(
  familyPageId: string,
  familyMetadata: unknown,
  snapshots: WikiPageLineageSnapshot[],
): WikiPageLineageSnapshot[] {
  const members = snapshots.filter((page) => {
    const lineage = parseCharacterLineageMetadata(page.metadata);
    return lineage.familyId === familyPageId;
  });
  const family = parseFamilyMetadata(familyMetadata);
  if (
    family.headCharacterId &&
    !members.some((member) => member.id === family.headCharacterId)
  ) {
    const head = snapshots.find((page) => page.id === family.headCharacterId);
    if (head) members.push(head);
  }
  return members;
}

export function orgsWithStanceToward(
  targetOrgId: string,
  stance: OrgRelationStance,
  orgPages: WikiPageLineageSnapshot[],
  date: ChronologyDateParts,
  relationType?: OrgRelationCategory,
  isDMUser = true,
): Array<{
  org: WikiPageLineageSnapshot;
  relation: { id: string };
  event: NonNullable<ReturnType<typeof resolveOrgStanceAt>>;
}> {
  const results: Array<{
    org: WikiPageLineageSnapshot;
    relation: { id: string };
    event: NonNullable<ReturnType<typeof resolveOrgStanceAt>>;
  }> = [];

  for (const page of orgPages) {
    const org = parseOrganizationMetadata(page.metadata);
    for (const relation of org.relations) {
      if (relation.targetOrgId !== targetOrgId) continue;
      const event = resolveOrgStanceAt(relation, date, relationType);
      if (!event || event.stance !== stance) continue;
      if (!isRelationVisibleToViewer(event.visibility, isDMUser)) continue;
      results.push({ org: page, relation: { id: relation.id }, event });
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

export { resolveOrgStanceAt, resolveOrgRelationsAt } from './organizationMetadata';
export type { OrganizationMetadataFields };
