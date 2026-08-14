import {
  formatActiveRangeLabel,
  formatBornLabel,
  formatDiedLabel,
} from '@/components/entity/TemporalStatusBadge';
import {
  isCharacterAliveAt,
  parseCharacterLineageMetadata,
} from './characterLineageMetadata';
import {
  buildCharacterConnectionProjection,
  type CharacterConnectionEntry,
} from './characterConnectionProjection';
import { buildCharacterIdentityProjection } from './characterIdentityProjection';
import { buildOrganizationIdentityProjection } from './organizationIdentityProjection';
import { buildFamilyIdentityProjection } from './familyIdentityProjection';
import { buildBestiaryIdentityProjection } from './bestiaryIdentityProjection';
import { buildAncestryIdentityProjection } from './ancestryIdentityProjection';
import { buildObjectIdentityProjection } from './objectIdentityProjection';
import { buildLocationIdentityProjection } from './locationIdentityProjection';
import { buildRuleResourceIdentityProjection } from './ruleResourceIdentityProjection';
import { resolveEntitySurfaceProfile } from './entitySurfaceProfile';
import type { SurfaceProfileKey } from './entitySurfaceProfile';
import type { WikiTreeNode } from '@/types/wiki';
import type { CharacterLifeStatus } from './characterMetadata';
import type { ChronologyDateParts, OrgRelationCategory, OrgRelationStance } from './entityRelationTypes';
import {
  dateSortKey,
  isRelationVisibleToViewer,
} from './entityRelationTypes';
import type { WikiPageLineageSnapshot } from './entityProjectionQueries';
import { buildEntityRelationshipProjection } from './entityProjectionQueries';
import { parseFamilyMetadata } from './familyMetadata';
import {
  parseOrganizationMetadata,
  resolveOrgStanceAt,
} from './organizationMetadata';
import { buildProjectionProvenance, type ProjectionProvenance } from './projectionProvenance';

export interface EntityPreviewBase {
  pageId: string;
  title: string;
  templateType: string;
  surfaceProfileKey: SurfaceProfileKey;
  emblemUrl?: string | null;
  leaderTitle?: string | null;
  headTitle?: string | null;
  motto?: string | null;
  pronouns?: string | null;
  identitySubtitle?: string | null;
  knownFor?: string | null;
  appearanceSummary?: string | null;
  lifeStatusVariant?: CharacterLifeStatus;
}

export interface EntityPreviewProjection {
  resolvedStance?: OrgRelationStance | null;
  relationType?: OrgRelationCategory;
  visibleTensions?: Array<
    { orgTitle: string; stance: OrgRelationStance; direction: string } & ProjectionProvenance
  >;
  currentAffiliations?: Array<
    { orgTitle: string; role: string | null } & ProjectionProvenance
  >;
  temporalBadges?: Array<{ variant: string; label: string }>;
  timelineNote?: string | null;
  visibilityLabel?: string | null;
  stanceProvenance?: ProjectionProvenance;
  statusLabel?: string | null;
  lifeStatusVariant?: CharacterLifeStatus;
  overflowSegments?: string[];
  connectedThrough?: CharacterConnectionEntry[];
}

export interface EntityPreviewContext {
  campaignNow: ChronologyDateParts;
  isDMUser: boolean;
  viewerOrgId?: string;
  viewerPageId?: string;
  viewerCharacterId?: string;
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

/** Pure, deterministic — static entity summary */
export function buildEntityPreviewBase(
  pageId: string,
  flatPages: readonly WikiPageLineageSnapshot[],
  context?: EntityPreviewContext,
): EntityPreviewBase | null {
  const page = findPage(flatPages, pageId);
  if (!page) return null;

  const surfaceProfile = resolveEntitySurfaceProfile({
    pageId,
    templateType: page.templateType,
    metadata: page.metadata,
    flatPages: flatPages as unknown as WikiTreeNode[],
  });

  const base: EntityPreviewBase = {
    pageId: page.id,
    title: page.title,
    templateType: page.templateType,
    surfaceProfileKey: surfaceProfile.key,
  };

  if (surfaceProfile.key === 'organization') {
    const org = parseOrganizationMetadata(page.metadata);
    const orgProjection = buildOrganizationIdentityProjection(pageId, flatPages);
    base.motto = org.motto;
    base.leaderTitle = resolveTitle(flatPages, org.leaderId);
    base.identitySubtitle = orgProjection?.identityLine ?? null;
    base.knownFor = orgProjection?.knownFor ?? null;
  }

  if (surfaceProfile.key === 'family') {
    const familyProjection = buildFamilyIdentityProjection(pageId, flatPages);
    base.headTitle = resolveTitle(
      flatPages,
      parseFamilyMetadata(page.metadata).headCharacterId,
    );
    base.identitySubtitle = familyProjection?.identityLine ?? null;
    base.knownFor = familyProjection?.knownFor ?? null;
  }

  if (surfaceProfile.key === 'bestiary') {
    const bestiaryProjection = buildBestiaryIdentityProjection(pageId, flatPages);
    if (bestiaryProjection) {
      base.identitySubtitle = bestiaryProjection.identityLine || null;
      base.knownFor = bestiaryProjection.knownFor;
    }
  }

  if (surfaceProfile.key === 'ancestry') {
    const projection = buildAncestryIdentityProjection(pageId, flatPages);
    if (projection) {
      base.identitySubtitle = projection.identityLine || null;
      base.knownFor = projection.knownFor;
    }
  }

  if (surfaceProfile.key === 'object') {
    const projection = buildObjectIdentityProjection(pageId, flatPages);
    if (projection) {
      base.identitySubtitle = projection.identityLine || null;
      base.knownFor = projection.knownFor;
    }
  }

  if (surfaceProfile.key === 'location') {
    const projection = buildLocationIdentityProjection(pageId, flatPages);
    if (projection) {
      base.identitySubtitle = projection.identityLine || null;
      base.knownFor = projection.knownFor;
    }
  }

  if (surfaceProfile.key === 'rule-resource') {
    const projection = buildRuleResourceIdentityProjection(pageId, flatPages);
    if (projection) {
      base.identitySubtitle = projection.identityLine || null;
      base.knownFor = projection.knownFor;
    }
  }

  if (surfaceProfile.key === 'character' && context) {
    const identityProjection = buildCharacterIdentityProjection(
      pageId,
      flatPages,
      context.campaignNow,
    );
    if (identityProjection) {
      base.pronouns = identityProjection.pronouns;
      base.identitySubtitle = identityProjection.roleSubtitle;
      base.knownFor = identityProjection.knownFor;
      base.appearanceSummary = identityProjection.appearanceSummary;
      base.lifeStatusVariant = identityProjection.lifeStatusVariant;
    }
  }

  return base;
}

function buildTemporalBadgesForCharacter(
  lineage: ReturnType<typeof parseCharacterLineageMetadata>,
  campaignNow: ChronologyDateParts,
): Array<{ variant: string; label: string }> {
  const badges: Array<{ variant: string; label: string }> = [];
  if (lineage.birthDate) {
    badges.push({ variant: 'born', label: formatBornLabel(lineage.birthDate) });
  }
  if (lineage.deathDate) {
    badges.push({ variant: 'died', label: formatDiedLabel(lineage.deathDate) });
  } else if (isCharacterAliveAt(lineage, campaignNow)) {
    badges.push({
      variant: 'active-range',
      label: formatActiveRangeLabel(lineage.birthDate, null),
    });
  }
  return badges;
}

/** Pure, deterministic — temporal + relational slice */
export function buildEntityPreviewProjection(
  pageId: string,
  flatPages: readonly WikiPageLineageSnapshot[],
  context: EntityPreviewContext,
): EntityPreviewProjection {
  const { campaignNow, isDMUser, viewerOrgId, viewerPageId, viewerCharacterId } =
    context;
  const page = findPage(flatPages, pageId);
  if (!page) return {};

  const surfaceProfile = resolveEntitySurfaceProfile({
    pageId,
    templateType: page.templateType,
    metadata: page.metadata,
    flatPages: flatPages as unknown as WikiTreeNode[],
  });

  const projection: EntityPreviewProjection = {};

  if (surfaceProfile.key === 'organization' && viewerOrgId) {
    const org = parseOrganizationMetadata(page.metadata);
    for (const relation of org.relations) {
      if (relation.targetOrgId !== viewerOrgId) continue;
      const event = resolveOrgStanceAt(relation, campaignNow);
      if (!event || !isRelationVisibleToViewer(event.visibility, isDMUser)) continue;
      projection.resolvedStance = event.stance;
      projection.relationType = event.relationType;
      projection.timelineNote = event.note ?? null;
      projection.visibilityLabel = event.visibility;
      projection.stanceProvenance = buildProjectionProvenance({
        relationIds: [relation.id, event.id],
        resolvedFromDate: campaignNow,
      });
      break;
    }
  }

  if (surfaceProfile.key === 'character') {
    const lineage = parseCharacterLineageMetadata(page.metadata);
    projection.temporalBadges = buildTemporalBadgesForCharacter(lineage, campaignNow);

    const identityProjection = buildCharacterIdentityProjection(
      pageId,
      flatPages,
      campaignNow,
    );
    if (identityProjection) {
      projection.statusLabel = identityProjection.statusLabel;
      projection.lifeStatusVariant = identityProjection.lifeStatusVariant;
      projection.overflowSegments = identityProjection.overflowSegments;
    }

    const queryKey = dateSortKey(campaignNow);
    const affiliations = lineage.orgAffiliations
      .filter((aff) => {
        if (!isRelationVisibleToViewer(aff.visibility, isDMUser)) return false;
        if (aff.startDate && dateSortKey(aff.startDate) > queryKey) return false;
        if (aff.endDate && dateSortKey(aff.endDate) < queryKey) return false;
        return true;
      })
      .map((aff) => ({
        orgTitle: resolveTitle(flatPages, aff.orgId) ?? aff.orgId,
        role: aff.role,
        orgId: aff.orgId,
        ...buildProjectionProvenance({
          relationIds: [aff.id],
          resolvedFromDate: campaignNow,
        }),
      }));

    const primaryId = identityProjection?.affiliationId;
    if (primaryId) {
      affiliations.sort((a, b) => {
        if (a.orgId === primaryId) return -1;
        if (b.orgId === primaryId) return 1;
        return 0;
      });
    }

    projection.currentAffiliations = affiliations.map(({ orgId: _orgId, ...rest }) => rest);

    const connection = buildCharacterConnectionProjection(
      pageId,
      { viewerPageId, viewerCharacterId, viewerOrgId },
      flatPages,
      campaignNow,
      isDMUser,
    );
    if (connection.connectedThrough.length > 0) {
      projection.connectedThrough = connection.connectedThrough;
    }
  }

  if (surfaceProfile.key === 'organization' || surfaceProfile.key === 'family') {
    const relProjection = buildEntityRelationshipProjection(
      pageId,
      page.templateType,
      flatPages,
      campaignNow,
      isDMUser,
    );

    projection.visibleTensions = relProjection.diplomaticTensions.map((row) => ({
      orgTitle: row.org.title,
      stance: row.stance,
      direction: row.direction,
      sourceRelationIds: [...row.sourceRelationIds],
      sourceLineageIds: [...row.sourceLineageIds],
      resolvedFromDate: { ...row.resolvedFromDate },
    }));
  }

  return projection;
}
