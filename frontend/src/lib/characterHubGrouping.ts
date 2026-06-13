import type { CategoryIndexChild } from '@/lib/wiki';
import type {
  CharacterCastContext,
  CharacterHubLatestSession,
  CharacterHubPayload,
  CharacterPresenceTier,
} from '@/lib/characterHub';

export interface EnrichedCharacterEntry {
  child: CategoryIndexChild;
  context: CharacterCastContext;
}

export interface CharacterLocationGroup {
  locationPageId: string | null;
  locationTitle: string;
  characters: EnrichedCharacterEntry[];
  isLatestSessionLocation: boolean;
}

export interface CharacterPresenceBand {
  tier: CharacterPresenceTier;
  label: string;
  locationGroups: CharacterLocationGroup[];
}

const PRESENCE_BAND_LABELS: Record<CharacterPresenceTier, string> = {
  active: 'Active This Session',
  recent: 'Recently Active',
  dormant: 'Dormant',
};

const PRESENCE_BAND_ORDER: CharacterPresenceTier[] = ['active', 'recent', 'dormant'];

const PRESENCE_ORDER: Record<CharacterPresenceTier, number> = {
  active: 0,
  recent: 1,
  dormant: 2,
};

function compareCharactersInGroup(
  a: EnrichedCharacterEntry,
  b: EnrichedCharacterEntry,
): number {
  if (a.context.isPartyMember !== b.context.isPartyMember) {
    return a.context.isPartyMember ? -1 : 1;
  }

  const tierDiff =
    PRESENCE_ORDER[a.context.presenceTier] -
    PRESENCE_ORDER[b.context.presenceTier];
  if (tierDiff !== 0) return tierDiff;

  if (a.context.mentionedInLatestSession !== b.context.mentionedInLatestSession) {
    return a.context.mentionedInLatestSession ? -1 : 1;
  }

  const updatedDiff =
    new Date(b.child.updatedAt).getTime() - new Date(a.child.updatedAt).getTime();
  if (updatedDiff !== 0) return updatedDiff;

  return a.child.title.localeCompare(b.child.title);
}

export function enrichCharacterEntries(
  payload: CharacterHubPayload,
  filteredChildren: CategoryIndexChild[],
): EnrichedCharacterEntry[] {
  return filteredChildren.map((child) => ({
    child,
    context: payload.characterContext[child.id] ?? {
      locationPageId: null,
      locationTitle: 'Unknown',
      portraitUrl: null,
      identityLine: null,
      lifeStatus: 'UNKNOWN',
      presenceTier: 'dormant',
      mentionedInLatestSession: false,
      lastSeen: null,
      knownThrough: null,
      activeQuests: [],
      coSeenWith: [],
      memorySnippet: null,
      isPartyMember: false,
      partyRoleLabel: null,
      primaryAffiliationId: null,
      primaryAffiliationTitle: null,
    },
  }));
}

export function groupCharactersByLocation(
  entries: EnrichedCharacterEntry[],
  latestSession: CharacterHubLatestSession | null,
): CharacterLocationGroup[] {
  const groups = new Map<string, CharacterLocationGroup>();

  for (const entry of entries) {
    const locationPageId = entry.context.locationPageId;
    const key = locationPageId ?? '__unknown__';
    const existing = groups.get(key);
    if (existing) {
      existing.characters.push(entry);
    } else {
      groups.set(key, {
        locationPageId,
        locationTitle: entry.context.locationTitle,
        characters: [entry],
        isLatestSessionLocation: Boolean(
          latestSession?.locationPageId &&
            latestSession.locationPageId === locationPageId,
        ),
      });
    }
  }

  for (const group of groups.values()) {
    group.characters.sort(compareCharactersInGroup);
  }

  const result = [...groups.values()].sort((a, b) => {
    if (a.isLatestSessionLocation !== b.isLatestSessionLocation) {
      return a.isLatestSessionLocation ? -1 : 1;
    }
    if (a.locationPageId === null) return 1;
    if (b.locationPageId === null) return -1;
    if (b.characters.length !== a.characters.length) {
      return b.characters.length - a.characters.length;
    }
    return a.locationTitle.localeCompare(b.locationTitle);
  });

  return result;
}

export function groupCharactersByPresenceTier(
  entries: EnrichedCharacterEntry[],
  latestSession: CharacterHubLatestSession | null,
): CharacterPresenceBand[] {
  const byTier = new Map<CharacterPresenceTier, EnrichedCharacterEntry[]>();
  for (const tier of PRESENCE_BAND_ORDER) {
    byTier.set(tier, []);
  }

  for (const entry of entries) {
    const tier = entry.context.presenceTier;
    byTier.get(tier)?.push(entry);
  }

  return PRESENCE_BAND_ORDER.flatMap((tier) => {
    const tierEntries = byTier.get(tier) ?? [];
    if (tierEntries.length === 0) return [];
    return [
      {
        tier,
        label: PRESENCE_BAND_LABELS[tier],
        locationGroups: groupCharactersByLocation(tierEntries, latestSession),
      },
    ];
  });
}

export function resolveSpotlightCharacterId(
  payload: CharacterHubPayload,
): string | null {
  const mentioned = payload.latestSession?.mentionedCharacterIds ?? [];
  if (mentioned.length > 0) return mentioned[0];

  for (const session of payload.recentlySeenBySession) {
    if (session.characters.length > 0) return session.characters[0].id;
  }

  return payload.children[0]?.id ?? null;
}
