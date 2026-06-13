import type { EnrichedCharacterEntry } from '@/lib/characterHubGrouping';
import type { CharacterHubLinkRef, CharacterPresenceTier } from '@/lib/characterHub';

export interface CharacterCastEntryProps {
  id: string;
  title: string;
  portraitUrl: string | null;
  identityLine: string | null;
  presenceTier: CharacterPresenceTier;
  mentionedInLatestSession: boolean;
  lastSeenLabel: string | null;
  lastSeenHref: string | null;
  knownThroughLabel: string | null;
  knownThroughHref: string | null;
  activeQuests: CharacterHubLinkRef[];
  coSeenWith: Array<{ id: string; title: string }>;
  memorySnippet: string | null;
  isPartyMember: boolean;
  partyRoleLabel: string | null;
  lifeStatus: string;
}

export function projectCastEntryProps(
  entry: EnrichedCharacterEntry,
): CharacterCastEntryProps {
  const { child, context } = entry;
  return {
    id: child.id,
    title: child.title,
    portraitUrl: context.portraitUrl,
    identityLine: context.identityLine,
    presenceTier: context.presenceTier,
    mentionedInLatestSession: context.mentionedInLatestSession,
    lastSeenLabel: context.lastSeen?.sessionTitle ?? null,
    lastSeenHref: context.lastSeen?.href ?? null,
    knownThroughLabel: context.knownThrough?.title ?? null,
    knownThroughHref: context.knownThrough?.href ?? null,
    activeQuests: context.activeQuests,
    coSeenWith: context.coSeenWith,
    memorySnippet: context.memorySnippet,
    isPartyMember: context.isPartyMember,
    partyRoleLabel: context.partyRoleLabel,
    lifeStatus: context.lifeStatus,
  };
}

export function presenceTierLabel(
  tier: CharacterPresenceTier,
  mentionedInLatestSession: boolean,
): string {
  if (mentionedInLatestSession || tier === 'active') return 'Active';
  if (tier === 'recent') return 'Recent';
  return 'Dormant';
}
