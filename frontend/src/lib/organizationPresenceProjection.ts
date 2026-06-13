import {
  INFLUENCE_MODE_LABELS,
  ORGANIZATIONAL_VISIBILITY_LABELS,
  parseOrganizationMetadata,
  type OrganizationMetadataFields,
} from '@/lib/organizationMetadata';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';

export const ORG_PRESENCE_LABELS = {
  strongholds: 'Strongholds',
  influence: 'Influence reaches',
  territories: 'Active territories',
  enclaves: 'Hidden enclaves',
  trade: 'Trade reach',
  contested: 'Contested zones',
} as const;

export interface OrganizationPresenceSection {
  label: string;
  locationIds: string[];
  locationTitles: string[];
}

export interface OrganizationPresenceProjection {
  sections: OrganizationPresenceSection[];
  influenceModeLabel: string | null;
  visibilityLabel: string | null;
  knownMethods: string | null;
  excerpt: string;
}

function findPage(
  flatPages: readonly WikiPageLineageSnapshot[],
  pageId: string,
): WikiPageLineageSnapshot | null {
  return flatPages.find((page) => page.id === pageId) ?? null;
}

function resolveTitles(
  flatPages: readonly WikiPageLineageSnapshot[],
  ids: string[],
): string[] {
  return ids
    .map((id) => findPage(flatPages, id)?.title ?? null)
    .filter((title): title is string => Boolean(title));
}

function buildSections(
  org: OrganizationMetadataFields,
  flatPages: readonly WikiPageLineageSnapshot[],
): OrganizationPresenceSection[] {
  const defs: Array<{ key: keyof typeof ORG_PRESENCE_LABELS; ids: string[] }> = [
    { key: 'strongholds', ids: org.strongholdLocationIds },
    { key: 'influence', ids: org.influenceRegionIds },
    { key: 'territories', ids: org.activeTerritoryIds },
    { key: 'enclaves', ids: org.hiddenEnclaveIds },
    { key: 'trade', ids: org.tradeReachRegionIds },
    { key: 'contested', ids: org.contestedZoneIds },
  ];
  return defs
    .filter((d) => d.ids.length > 0)
    .map((d) => ({
      label: ORG_PRESENCE_LABELS[d.key],
      locationIds: d.ids,
      locationTitles: resolveTitles(flatPages, d.ids),
    }));
}

export function buildOrganizationPresenceProjection(
  pageId: string,
  flatPages: readonly WikiPageLineageSnapshot[],
  options?: { includeChildRollup?: boolean },
): OrganizationPresenceProjection | null {
  const page = findPage(flatPages, pageId);
  if (!page) return null;
  const org = parseOrganizationMetadata(page.metadata);
  const sections = buildSections(org, flatPages);

  if (options?.includeChildRollup) {
    const children = flatPages.filter(
      (p) => parseOrganizationMetadata(p.metadata).parentOrgId === pageId,
    );
    for (const child of children) {
      const childOrg = parseOrganizationMetadata(child.metadata);
      const childSections = buildSections(childOrg, flatPages);
      for (const cs of childSections) {
        const existing = sections.find((s) => s.label === cs.label);
        if (existing) {
          for (const id of cs.locationIds) {
            if (!existing.locationIds.includes(id)) {
              existing.locationIds.push(id);
              const title = findPage(flatPages, id)?.title;
              if (title) existing.locationTitles.push(`${title} (${child.title})`);
            }
          }
        } else if (cs.locationIds.length > 0) {
          sections.push({
            label: cs.label,
            locationIds: [...cs.locationIds],
            locationTitles: cs.locationTitles.map((t) => `${t} (${child.title})`),
          });
        }
      }
    }
  }

  const parts: string[] = [];
  if (org.influenceMode) parts.push(INFLUENCE_MODE_LABELS[org.influenceMode]);
  if (org.organizationalVisibility) {
    parts.push(ORGANIZATIONAL_VISIBILITY_LABELS[org.organizationalVisibility]);
  }
  const firstSection = sections[0];
  if (firstSection?.locationTitles[0]) {
    parts.push(firstSection.locationTitles[0]);
  } else if (org.region) {
    parts.push(org.region);
  }

  return {
    sections,
    influenceModeLabel: org.influenceMode ? INFLUENCE_MODE_LABELS[org.influenceMode] : null,
    visibilityLabel: org.organizationalVisibility
      ? ORGANIZATIONAL_VISIBILITY_LABELS[org.organizationalVisibility]
      : null,
    knownMethods: org.methods,
    excerpt: parts.join(' · ') || 'Presence not recorded',
  };
}

export function formatPresenceExcerpt(projection: OrganizationPresenceProjection): string {
  return projection.excerpt;
}
