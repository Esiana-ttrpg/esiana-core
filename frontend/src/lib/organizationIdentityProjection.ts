import { mapAssetImageUrl } from '@/lib/maps';
import {
  INFLUENCE_MODE_LABELS,
  OPERATIONAL_SCALE_LABELS,
  ORGANIZATION_WORLD_STATE_LABELS,
  ORGANIZATIONAL_VISIBILITY_LABELS,
  parseOrganizationMetadata,
} from '@/lib/organizationMetadata';
import { resolveDoctrineTint } from '@/lib/organizationSymbolPresets';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';
import type {
  InfluenceMode,
  OperationalScale,
  OrganizationSymbolPreset,
  OrganizationWorldState,
  OrganizationalVisibility,
} from '@/lib/organizationMetadata';

export interface OrganizationIdentityProjection {
  displayName: string;
  subtitle: string | null;
  identityLine: string;
  knownFor: string | null;
  publicPurpose: string | null;
  streetBelief: string | null;
  topPressure: string | null;
  worldState: OrganizationWorldState | null;
  worldStateLabel: string | null;
  operationalScale: OperationalScale | null;
  operationalScaleLabel: string | null;
  influenceMode: InfluenceMode | null;
  influenceModeLabel: string | null;
  organizationalVisibility: OrganizationalVisibility | null;
  visibilityLabel: string | null;
  symbolPreset: OrganizationSymbolPreset | null;
  doctrineTint: string | null;
  parentOrgId: string | null;
  parentTitle: string | null;
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

export function buildOrganizationIdentityProjection(
  pageId: string,
  flatPages: readonly WikiPageLineageSnapshot[],
): OrganizationIdentityProjection | null {
  const page = findPage(flatPages, pageId);
  if (!page) return null;

  const org = parseOrganizationMetadata(page.metadata);
  const hqTitle = resolveTitle(flatPages, org.headquartersId);
  const parentTitle = resolveTitle(flatPages, org.parentOrgId);

  const lineParts: string[] = [];
  if (org.orgType) lineParts.push(org.orgType);
  if (org.publicPurpose) lineParts.push(org.publicPurpose);
  else if (org.motto) lineParts.push(org.motto);
  if (org.worldState) lineParts.push(ORGANIZATION_WORLD_STATE_LABELS[org.worldState]);
  if (org.influenceMode) lineParts.push(INFLUENCE_MODE_LABELS[org.influenceMode]);
  if (hqTitle) lineParts.push(hqTitle);
  else if (org.region) lineParts.push(org.region);

  const identityLine = lineParts.join(' · ');
  const subtitle =
    org.publicPurpose && org.motto && org.publicPurpose !== org.motto
      ? org.motto
      : null;

  return {
    displayName: page.title,
    subtitle,
    identityLine,
    knownFor: org.publicPurpose ?? org.motto,
    publicPurpose: org.publicPurpose,
    streetBelief: org.publicReputation,
    topPressure: org.currentPressures[0] ?? null,
    worldState: org.worldState,
    worldStateLabel: org.worldState
      ? ORGANIZATION_WORLD_STATE_LABELS[org.worldState]
      : null,
    operationalScale: org.operationalScale,
    operationalScaleLabel: org.operationalScale
      ? OPERATIONAL_SCALE_LABELS[org.operationalScale]
      : null,
    influenceMode: org.influenceMode,
    influenceModeLabel: org.influenceMode
      ? INFLUENCE_MODE_LABELS[org.influenceMode]
      : null,
    organizationalVisibility: org.organizationalVisibility,
    visibilityLabel: org.organizationalVisibility
      ? ORGANIZATIONAL_VISIBILITY_LABELS[org.organizationalVisibility]
      : null,
    symbolPreset: org.symbolPreset,
    doctrineTint: resolveDoctrineTint(org.symbolPreset, org.doctrineTint),
    parentOrgId: org.parentOrgId,
    parentTitle,
    emblemUrl: org.emblemAssetId
      ? mapAssetImageUrl(org.emblemAssetId, 'thumb')
      : null,
  };
}
