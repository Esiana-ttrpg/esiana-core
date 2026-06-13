import { apiFetch } from '@/lib/api';
import type { CategoryDiscoverySummary, CategoryIndexChild } from '@/lib/wiki';

export type CharacterPresenceTier = 'active' | 'recent' | 'dormant';

export interface CharacterHubLinkRef {
  id: string;
  title: string;
  href: string;
}

export interface CharacterKnownThroughRef {
  kind: 'quest' | 'session';
  id: string;
  title: string;
  href: string;
}

export interface CharacterCastContext {
  locationPageId: string | null;
  locationTitle: string;
  portraitUrl: string | null;
  identityLine: string | null;
  lifeStatus: string;
  presenceTier: CharacterPresenceTier;
  mentionedInLatestSession: boolean;
  lastSeen: {
    sessionId: string;
    sessionTitle: string;
    href: string;
  } | null;
  knownThrough: CharacterKnownThroughRef | null;
  activeQuests: CharacterHubLinkRef[];
  coSeenWith: Array<{ id: string; title: string }>;
  memorySnippet: string | null;
  isPartyMember: boolean;
  partyRoleLabel: string | null;
  primaryAffiliationId: string | null;
  primaryAffiliationTitle: string | null;
}

export interface CharacterHubLatestSession {
  id: string;
  title: string;
  locationPageId: string | null;
  locationTitle: string | null;
  href: string;
  mentionedCharacterIds: string[];
}

export interface CharacterHubRecentlySeenSession {
  sessionId: string;
  sessionTitle: string;
  href: string;
  characters: CharacterHubLinkRef[];
}

export interface CharacterHubLocationCount {
  locationPageId: string | null;
  locationTitle: string;
  count: number;
}

export interface CharacterHubPayload {
  category: {
    id: string;
    title: string;
    isIndexCategory: boolean;
  };
  children: CategoryIndexChild[];
  discoverySummary?: CategoryDiscoverySummary | null;
  latestSession: CharacterHubLatestSession | null;
  recentlySeenBySession: CharacterHubRecentlySeenSession[];
  locationCounts: CharacterHubLocationCount[];
  characterContext: Record<string, CharacterCastContext>;
}

export async function fetchCharacterHub(
  campaignHandle: string,
  categoryPageId: string,
): Promise<CharacterHubPayload> {
  return apiFetch<CharacterHubPayload>(
    `/campaigns/${campaignHandle}/wiki/character-hub/${categoryPageId}`,
  );
}
