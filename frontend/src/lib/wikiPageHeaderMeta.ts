import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import type { ContentRevelationState } from '@/lib/contentPresence';
import type { WikiPlayerEntry, WikiTreeNode } from '@/types/wiki';
import type {
  DiscoveryState,
  DiscoveryStateProjection,
} from '@shared/discoveryProjection';
import { isCategoryIndexPage } from '@/lib/wikiCategories';
import { buildWikiPageLookup, walkAncestorIds } from '@/lib/wikiHierarchy';

/** Human-readable visibility (who may access the page). */
export function formatWikiVisibilityLabel(visibility: string): string {
  if (visibility === 'DM_Only') return 'DM only';
  if (visibility === 'Party') return 'Visible to party';
  if (visibility === 'Public') return 'Public';
  return visibility;
}

/** Discovery / party knowledge state (not the same as visibility). */
export function formatDiscoveryStateLabel(state: string): string {
  if (state === 'HIDDEN') return 'Hidden from party';
  if (state === 'DRAFT') return 'Draft';
  if (state === 'REVEALED') return 'Revealed to party';
  return state;
}

export function formatRichDiscoveryStateLabel(state: DiscoveryState): string {
  if (state === 'hidden') return 'Hidden';
  if (state === 'rumor') return 'Rumor';
  if (state === 'partial') return 'Partial';
  if (state === 'contested') return 'Contested';
  if (state === 'known') return 'Known';
  return state;
}

export function formatDiscoveryGateLabel(gatedUntil: number): string {
  return `Available after epoch ${gatedUntil}`;
}

export type DiscoveryBadgeSurface = 'browse' | 'header' | 'codex';

export function shouldShowDiscoveryBadge(
  discovery: DiscoveryStateProjection | null | undefined,
  surface: DiscoveryBadgeSurface,
): boolean {
  if (!discovery) return false;
  if (!discovery.available) return true;
  return discovery.state !== 'known';
}

export function discoveryBadgeTone(
  discovery: DiscoveryStateProjection,
): string {
  if (!discovery.available) {
    return discovery.gatedUntil
      ? 'border-violet-500/40 bg-violet-500/10 text-violet-800 dark:text-violet-200'
      : 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200';
  }
  switch (discovery.state) {
    case 'rumor':
      return 'border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200';
    case 'partial':
      return 'border-yellow-500/40 bg-yellow-500/10 text-yellow-800 dark:text-yellow-200';
    case 'contested':
      return 'border-orange-500/40 bg-orange-500/10 text-orange-800 dark:text-orange-200';
    default:
      return 'border-border bg-muted/30 text-muted';
  }
}

export function discoveryControlLabel(state: ContentRevelationState | string): string {
  if (state === 'HIDDEN') return 'Discovery: Hidden';
  if (state === 'DRAFT') return 'Discovery: Draft';
  return 'Discovery: Revealed';
}

const NARRATIVE_KIND_BY_PROFILE: Partial<Record<SurfaceProfileKey, string>> = {
  character: 'Character',
  organization: 'Organization',
  family: 'Family',
  location: 'Location',
  bestiary: 'Creature',
  ancestry: 'Ancestry',
  language: 'Language',
  object: 'Object',
  'rule-resource': 'Rule reference',
  quest: 'Quest',
  thread: 'Narrative thread',
  scene: 'Scene',
};

/** Singular entity kind for the editor header (below page title). */
export function resolveEntityKindLabel(
  profileKey: SurfaceProfileKey,
  templateType: string,
): string | null {
  if (templateType === 'SESSION_NOTE') return 'Session note';
  if (templateType === 'CHARACTER') return 'Character';
  return NARRATIVE_KIND_BY_PROFILE[profileKey] ?? null;
}

/** Closest category-index ancestor title (e.g. Characters, Locations). */
export function resolveParentCategoryTitle(
  pageId: string,
  flatPages: WikiTreeNode[],
): string | null {
  const pageById = buildWikiPageLookup(flatPages);
  const ancestorIds = walkAncestorIds(pageId, pageById);
  for (const ancestorId of [...ancestorIds].reverse()) {
    const title = pageById.get(ancestorId)?.title;
    if (title && isCategoryIndexPage(title)) return title;
  }
  return null;
}

function isKindRedundantWithCategory(
  profileKey: SurfaceProfileKey,
  parentCategoryTitle: string | null,
): boolean {
  if (!parentCategoryTitle) return false;
  const normalized = parentCategoryTitle.toLowerCase();
  if (profileKey === 'character' && normalized === 'characters') return true;
  if (profileKey === 'organization' && normalized === 'organizations') return true;
  if (profileKey === 'family' && normalized === 'families') return true;
  if (profileKey === 'location' && normalized === 'locations') return true;
  if (profileKey === 'bestiary' && normalized === 'bestiary') return true;
  if (profileKey === 'quest' && normalized === 'quests') return true;
  if (
    profileKey === 'thread' &&
    (normalized === 'narrative threads' || normalized === 'threads')
  ) {
    return true;
  }
  if (profileKey === 'object' && normalized === 'objects') return true;
  if (profileKey === 'ancestry' && normalized === 'ancestries') return true;
  return false;
}

function findPlayerForPage(
  pageId: string,
  players: WikiPlayerEntry[],
): WikiPlayerEntry | null {
  return (
    players.find((p) => p.identityPageId === pageId) ?? null
  );
}

/** Editorial subtitle parts for the page header (identity only, no governance). */
export function resolvePageIdentitySubtitle(input: {
  pageId: string;
  profileKey: SurfaceProfileKey;
  templateType: string;
  profession?: string;
  knownFor?: string;
  players: WikiPlayerEntry[];
  flatPages: WikiTreeNode[];
}): string | null {
  const {
    pageId,
    profileKey,
    templateType,
    profession = '',
    knownFor = '',
    players,
    flatPages,
  } = input;

  const parentCategory = resolveParentCategoryTitle(pageId, flatPages);
  const parts: string[] = [];

  const linkedPlayer = findPlayerForPage(pageId, players);
  if (linkedPlayer) {
    const label =
      linkedPlayer.displayName?.trim() ||
      linkedPlayer.label?.trim() ||
      'Party member';
    parts.push(`Played by ${label}`);
  }

  if (templateType === 'SESSION_NOTE') {
    parts.unshift('Session note');
  } else if (
    !isKindRedundantWithCategory(profileKey, parentCategory) &&
    !linkedPlayer
  ) {
    const kind = NARRATIVE_KIND_BY_PROFILE[profileKey];
    if (kind) parts.push(kind);
  }

  const professionTrimmed = profession.trim();
  if (professionTrimmed) parts.push(professionTrimmed);

  const knownForTrimmed = knownFor.trim();
  if (knownForTrimmed && !parts.includes(knownForTrimmed)) {
    parts.push(knownForTrimmed);
  }

  if (parts.length === 0) return null;
  return parts.join(' · ');
}

/** @deprecated Use resolvePageIdentitySubtitle */
export function getNarrativePageKindLabel(
  profileKey: SurfaceProfileKey,
  templateType: string,
): string | null {
  if (templateType === 'SESSION_NOTE') return 'Session note';
  return NARRATIVE_KIND_BY_PROFILE[profileKey] ?? null;
}
