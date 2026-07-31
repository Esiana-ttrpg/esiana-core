import {
  formatCharacterStatusLabel,
  parseCharacterMetadata,
  resolveCharacterStatus,
} from '@/lib/characterMetadata';
import { parseCharacterLineageMetadata } from '@/lib/characterLineageMetadata';
import { parseAncestryMetadata } from '@/lib/ancestryMetadata';
import type { WikiTagInput, WikiTreeNode } from '@/types/wiki';
import type { CharacterIdentityProjection } from '@/lib/characterIdentityProjection';
import {
  buildEntityRelationshipProjection,
  type WikiPageLineageSnapshot,
} from '@/lib/entityProjectionQueries';
import type { ChronologyDateParts } from '@/lib/entityRelationTypes';

function pageTitle(flatPages: WikiTreeNode[], id: string | null | undefined): string | null {
  if (!id) return null;
  return flatPages.find((p) => p.id === id)?.title ?? null;
}

function formatAncestryOrigin(
  flatPages: WikiTreeNode[],
  ancestryId: string | null,
  lineageId: string | null,
  legacyAncestry: string | null,
): string | null {
  const lineageTitle = pageTitle(flatPages, lineageId);
  const ancestryTitle = pageTitle(flatPages, ancestryId);
  if (lineageTitle && ancestryTitle) return `${ancestryTitle} · ${lineageTitle}`;
  if (lineageTitle) return lineageTitle;
  if (ancestryTitle) return ancestryTitle;
  if (legacyAncestry?.trim()) return legacyAncestry.trim();
  return null;
}

function formatAffiliations(
  primaryAffiliationId: string | null,
  primaryTitle: string | null,
  orgAffiliationTitles: string[],
): string | null {
  const parts: string[] = [];
  if (primaryTitle?.trim()) {
    parts.push(primaryTitle.trim());
  } else if (primaryAffiliationId) {
    parts.push('Organization');
  }
  for (const title of orgAffiliationTitles) {
    if (title.trim() && !parts.includes(title.trim())) {
      parts.push(title.trim());
    }
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

function formatTags(tags: WikiTagInput[]): string | null {
  const names = tags.map((t) => t.name?.trim()).filter(Boolean) as string[];
  return names.length > 0 ? names.join(', ') : null;
}

export interface CharacterOverviewDisplayValues {
  name: string;
  title: string | null;
  role: string | null;
  pronouns: string | null;
  status: string | null;
  ancestryOrigin: string | null;
  homeLocation: string | null;
  families: string | null;
  affiliations: string | null;
  gender: string | null;
  tags: string | null;
}

export function buildCharacterOverviewDisplayValues(options: {
  displayTitle: string;
  pageMetadata: unknown;
  characterProjection?: CharacterIdentityProjection | null;
  flatPages: WikiTreeNode[];
  pageTags: WikiTagInput[];
  campaignNow: ChronologyDateParts;
  isDMUser: boolean;
  pageId: string;
  templateType: string;
}): CharacterOverviewDisplayValues {
  const identity = parseCharacterMetadata(options.pageMetadata);
  const lineage = parseCharacterLineageMetadata(options.pageMetadata);
  const status = resolveCharacterStatus(identity, lineage);
  const projection = options.characterProjection;

  const snapshots: WikiPageLineageSnapshot[] = options.flatPages.map((p) => ({
    id: p.id,
    title: p.title,
    templateType: p.templateType,
    metadata: p.metadata ?? null,
  }));

  const relProjection = buildEntityRelationshipProjection(
    options.pageId,
    options.templateType,
    snapshots,
    options.campaignNow,
    options.isDMUser,
  );

  const orgAffiliationTitles = relProjection.affiliations
    .map((row) => (row.role ? `${row.org.title} (${row.role})` : row.org.title))
    .slice(0, 6);

  const primaryAffiliationTitle =
    pageTitle(options.flatPages, identity.primaryAffiliationId) ??
    projection?.affiliationTitle ??
    null;

  const familyTitle =
    pageTitle(options.flatPages, lineage.familyId) ?? projection?.familyTitle ?? null;

  const locationTitle =
    pageTitle(options.flatPages, identity.currentLocationId) ?? null;

  return {
    name: options.displayTitle?.trim() || '—',
    title: identity.title?.trim() || null,
    role: identity.profession?.trim() || projection?.roleSubtitle?.trim() || null,
    pronouns: identity.appearance.pronouns?.trim() || projection?.pronouns?.trim() || null,
    status: status ? formatCharacterStatusLabel(status) : projection?.statusLabel ?? null,
    ancestryOrigin: formatAncestryOrigin(
      options.flatPages,
      identity.ancestryId,
      identity.lineageId,
      identity.ancestry,
    ),
    homeLocation: locationTitle,
    families: familyTitle,
    affiliations: formatAffiliations(
      identity.primaryAffiliationId,
      primaryAffiliationTitle,
      orgAffiliationTitles,
    ),
    gender: identity.appearance.gender?.trim() || null,
    tags: formatTags(options.pageTags),
  };
}

export function resolveLineageAncestryPages(
  flatPages: WikiTreeNode[],
  ancestryId: string | null,
): WikiTreeNode[] {
  return flatPages.filter((p) => {
    const meta = parseAncestryMetadata(p.metadata);
    if (meta.entityKind !== 'lineage') return false;
    if (!ancestryId) return true;
    return meta.parentAncestryId === ancestryId;
  });
}

export function resolveRootAncestryPages(flatPages: WikiTreeNode[]): WikiTreeNode[] {
  return flatPages.filter(
    (p) => parseAncestryMetadata(p.metadata).entityKind === 'root',
  );
}
