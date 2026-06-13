import {
  buildCharacterIdentityProjection,
  composeIdentityLine,
  type CharacterIdentityProjection,
} from './characterIdentityProjection';
import { buildCharacterConnectionProjection } from './characterConnectionProjection';
import {
  parseCharacterMetadata,
  isCharacterWikiPage,
  type CharacterIdentityFields,
} from './characterMetadata';
import {
  isActivePartyCharacter,
  PARTY_PARTICIPATION_ROLE_LABELS,
  PARTY_PARTICIPATION_ROLE_RANK,
  parsePartyParticipation,
  PartyParticipationRoles,
  type PartyParticipationRole,
} from '@shared/partyParticipation';
import {
  parseCharacterLineageMetadata,
  type CharacterOrgAffiliation,
} from './characterLineageMetadata';
import { isEnsembleSpotlightRandom, type EnsembleConfig } from './ensembleConfig';
import type { ChronologyDateParts } from './entityRelationTypes';
import {
  dateSortKey,
  isRelationVisibleToViewer,
} from './entityRelationTypes';
import type { WikiPageLineageSnapshot } from './entityProjectionQueries';
import type { QuestStatus } from './questMetadata';
import { parseQuestMetadata } from './questMetadata';

export type PartyWikiTreePage = {
  id: string;
  parentId: string | null;
  templateType: string;
  title: string;
  metadata?: unknown;
};

export interface EnsembleMemberInput {
  userId: string;
  playerLabel: string;
  identityPageId: string | null;
}

export interface PartyMemberProjection {
  characterId: string;
  userId: string;
  playerLabel: string;
  identity: CharacterIdentityProjection;
  activeArc: string | null;
  motivation: string | null;
  /** Capped identity line for portrait cards (role + affiliation) */
  cardIdentityLine: string;
  affiliationId: string | null;
  partyRole: PartyParticipationRole;
  partyRoleLabel: string;
}

export interface PartyQuestPursuit {
  id: string;
  title: string;
  questStatus: QuestStatus;
  statusLabel: string;
  snippet: string | null;
}

export interface PartySpotlightProjection {
  member: PartyMemberProjection;
  quote: string | null;
  note: string | null;
  linkedPursuit: PartyQuestPursuit | null;
}

export interface PartySharedConnection {
  kind: 'affiliation' | 'family';
  label: string;
  pageId: string;
  memberCount: number;
}

export interface PartyDynamicsProjection {
  sharedConnections: PartySharedConnection[];
  tensionNotes: string[];
}

export interface PartyProjection {
  config: EnsembleConfig;
  members: PartyMemberProjection[];
  spotlight: PartySpotlightProjection | null;
  pursuits: PartyQuestPursuit[];
  dynamics: PartyDynamicsProjection;
  unmappedMemberCount: number;
}

const QUEST_STATUS_LABELS: Record<QuestStatus, string> = {
  AVAILABLE: 'Available',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  ABANDONED: 'Abandoned',
};

function findPage(
  flatPages: readonly WikiPageLineageSnapshot[],
  pageId: string,
): WikiPageLineageSnapshot | null {
  return flatPages.find((page) => page.id === pageId) ?? null;
}

function readNarrativeFields(metadata: unknown): Pick<
  CharacterIdentityFields,
  'activeArc' | 'motivation'
> {
  const parsed = parseCharacterMetadata(metadata);
  return {
    activeArc: parsed.activeArc,
    motivation: parsed.motivation,
  };
}

function buildCardIdentityLine(identity: CharacterIdentityProjection): string {
  const { visibleLine } = composeIdentityLine(
    [
      { key: 'role', label: identity.roleSubtitle ?? '' },
      { key: 'affiliation', label: identity.affiliationTitle ?? '' },
    ],
    2,
  );
  return visibleLine;
}

/** Characters with partyParticipation.active on wiki metadata. */
export function resolvePartyRosterMembers(input: {
  rosterMembers: EnsembleMemberInput[];
  wikiTreePages?: readonly PartyWikiTreePage[];
}): EnsembleMemberInput[] {
  const { rosterMembers, wikiTreePages = [] } = input;
  const memberByCharacterId = new Map<string, EnsembleMemberInput>();
  for (const row of rosterMembers) {
    if (!row.identityPageId) continue;
    memberByCharacterId.set(row.identityPageId, row);
  }

  const entries: EnsembleMemberInput[] = [];
  for (const page of wikiTreePages) {
    if (!isCharacterWikiPage(page)) continue;
    if (!isActivePartyCharacter(page.metadata)) continue;

    const mapped = memberByCharacterId.get(page.id);
    entries.push({
      userId: mapped?.userId ?? `party:${page.id}`,
      playerLabel: mapped?.playerLabel ?? page.title,
      identityPageId: page.id,
    });
  }

  return entries;
}

function sortMembers(
  members: PartyMemberProjection[],
  memberOrder: string[],
): PartyMemberProjection[] {
  const orderIndex = new Map(memberOrder.map((id, index) => [id, index]));
  return [...members].sort((a, b) => {
    const roleDiff =
      PARTY_PARTICIPATION_ROLE_RANK[a.partyRole] -
      PARTY_PARTICIPATION_ROLE_RANK[b.partyRole];
    if (roleDiff !== 0) return roleDiff;

    const aIdx = orderIndex.get(a.characterId) ?? Number.MAX_SAFE_INTEGER;
    const bIdx = orderIndex.get(b.characterId) ?? Number.MAX_SAFE_INTEGER;
    if (aIdx !== bIdx) return aIdx - bIdx;

    return a.identity.displayName.localeCompare(b.identity.displayName);
  });
}

function activeOrgAffiliationsAt(
  characterId: string,
  flatPages: readonly WikiPageLineageSnapshot[],
  campaignNow: ChronologyDateParts,
  isDMUser: boolean,
): CharacterOrgAffiliation[] {
  const page = findPage(flatPages, characterId);
  if (!page) return [];
  const lineage = parseCharacterLineageMetadata(page.metadata);
  const queryKey = dateSortKey(campaignNow);
  return lineage.orgAffiliations.filter((aff) => {
    if (!isRelationVisibleToViewer(aff.visibility, isDMUser)) return false;
    if (aff.startDate && dateSortKey(aff.startDate) > queryKey) return false;
    if (aff.endDate && dateSortKey(aff.endDate) < queryKey) return false;
    return true;
  });
}

export function buildPartyDynamicsProjection(
  members: PartyMemberProjection[],
  flatPages: readonly WikiPageLineageSnapshot[],
  campaignNow: ChronologyDateParts,
  isDMUser: boolean,
  tensionNotes: string[],
): PartyDynamicsProjection {
  const orgCounts = new Map<string, { label: string; count: number }>();
  const familyCounts = new Map<string, { label: string; count: number }>();

  for (const member of members) {
    if (member.affiliationId) {
      const org = findPage(flatPages, member.affiliationId);
      const label = org?.title ?? member.affiliationId;
      const existing = orgCounts.get(member.affiliationId);
      orgCounts.set(member.affiliationId, {
        label,
        count: (existing?.count ?? 0) + 1,
      });
    }

    const lineage = parseCharacterLineageMetadata(
      findPage(flatPages, member.characterId)?.metadata,
    );
    if (lineage.familyId) {
      const family = findPage(flatPages, lineage.familyId);
      const label = family?.title ?? lineage.familyId;
      const existing = familyCounts.get(lineage.familyId);
      familyCounts.set(lineage.familyId, {
        label,
        count: (existing?.count ?? 0) + 1,
      });
    }

    for (const aff of activeOrgAffiliationsAt(
      member.characterId,
      flatPages,
      campaignNow,
      isDMUser,
    )) {
      if (aff.orgId === member.affiliationId) continue;
      const org = findPage(flatPages, aff.orgId);
      const label = org?.title ?? aff.orgId;
      const existing = orgCounts.get(aff.orgId);
      orgCounts.set(aff.orgId, {
        label,
        count: (existing?.count ?? 0) + 1,
      });
    }
  }

  const sharedConnections: PartySharedConnection[] = [];

  for (const [pageId, row] of orgCounts) {
    if (row.count < 2) continue;
    sharedConnections.push({
      kind: 'affiliation',
      label: row.label,
      pageId,
      memberCount: row.count,
    });
  }

  for (const [pageId, row] of familyCounts) {
    if (row.count < 2) continue;
    sharedConnections.push({
      kind: 'family',
      label: row.label,
      pageId,
      memberCount: row.count,
    });
  }

  function minRoleRankForPageId(pageId: string): number {
    let minRank = Number.MAX_SAFE_INTEGER;
    for (const member of members) {
      const matches =
        (member.affiliationId === pageId && member.affiliationId !== null) ||
        parseCharacterLineageMetadata(
          findPage(flatPages, member.characterId)?.metadata,
        ).familyId === pageId;
      if (!matches) continue;
      const rank = PARTY_PARTICIPATION_ROLE_RANK[member.partyRole];
      if (rank < minRank) minRank = rank;
    }
    return minRank;
  }

  sharedConnections.sort((a, b) => {
    if (b.memberCount !== a.memberCount) return b.memberCount - a.memberCount;
    const rankDiff =
      minRoleRankForPageId(a.pageId) - minRoleRankForPageId(b.pageId);
    if (rankDiff !== 0) return rankDiff;
    return a.label.localeCompare(b.label);
  });

  return {
    sharedConnections,
    tensionNotes: [...tensionNotes],
  };
}

export function resolvePartyQuestPursuits(
  featuredQuestIds: string[],
  flatPages: readonly WikiPageLineageSnapshot[],
  questSnippets?: Record<string, string | null>,
): PartyQuestPursuit[] {
  const pursuits: PartyQuestPursuit[] = [];

  for (const questId of featuredQuestIds) {
    const page = findPage(flatPages, questId);
    if (!page) continue;
    const questMeta = parseQuestMetadata(page.metadata);
    pursuits.push({
      id: page.id,
      title: page.title,
      questStatus: questMeta.questStatus,
      statusLabel: QUEST_STATUS_LABELS[questMeta.questStatus],
      snippet: questSnippets?.[questId] ?? null,
    });
  }

  return pursuits;
}

export function buildPartyProjection(input: {
  config: EnsembleConfig;
  rosterMembers: EnsembleMemberInput[];
  flatPages: readonly WikiPageLineageSnapshot[];
  wikiTreePages?: readonly PartyWikiTreePage[];
  campaignNow: ChronologyDateParts;
  isDMUser: boolean;
  canViewCharacter: (characterId: string) => boolean;
  questSnippets?: Record<string, string | null>;
  /** Resolved character id when `config.spotlightCharacterId` is the random sentinel. */
  resolvedSpotlightCharacterId?: string | null;
}): PartyProjection {
  const {
    config,
    rosterMembers,
    flatPages,
    wikiTreePages,
    campaignNow,
    isDMUser,
    canViewCharacter,
    questSnippets,
    resolvedSpotlightCharacterId,
  } = input;

  const members: PartyMemberProjection[] = [];
  let unmappedMemberCount = 0;

  const memberByCharacterId = new Map<string, EnsembleMemberInput>();
  for (const row of rosterMembers) {
    if (!row.identityPageId) continue;
    memberByCharacterId.set(row.identityPageId, row);
  }

  const partyRoster = resolvePartyRosterMembers({ rosterMembers, wikiTreePages });

  for (const row of partyRoster) {
    if (!row.identityPageId) continue;
    if (!canViewCharacter(row.identityPageId)) continue;

    const pageMeta = findPage(flatPages, row.identityPageId)?.metadata;
    const participation = parsePartyParticipation(pageMeta);

    const identity = buildCharacterIdentityProjection(
      row.identityPageId,
      flatPages,
      campaignNow,
    );
    if (!identity) continue;

    const narrative = readNarrativeFields(pageMeta);

    if (
      participation.role === PartyParticipationRoles.PLAYER_CHARACTER &&
      !memberByCharacterId.has(row.identityPageId)
    ) {
      unmappedMemberCount += 1;
    }

    members.push({
      characterId: row.identityPageId,
      userId: row.userId,
      playerLabel: row.playerLabel,
      identity,
      activeArc: narrative.activeArc,
      motivation: narrative.motivation,
      cardIdentityLine: buildCardIdentityLine(identity),
      affiliationId: identity.affiliationId,
      partyRole: participation.role,
      partyRoleLabel: PARTY_PARTICIPATION_ROLE_LABELS[participation.role],
    });
  }

  const sortedMembers = sortMembers(members, config.memberOrder);
  const pursuits = resolvePartyQuestPursuits(
    config.featuredQuestIds,
    flatPages,
    questSnippets,
  );

  const spotlightTargetId = isEnsembleSpotlightRandom(config.spotlightCharacterId)
    ? resolvedSpotlightCharacterId ?? null
    : config.spotlightCharacterId;

  let spotlight: PartySpotlightProjection | null = null;
  if (spotlightTargetId) {
    const spotlightMember = sortedMembers.find(
      (member) => member.characterId === spotlightTargetId,
    );
    if (spotlightMember) {
      const linkedPursuit = pursuits[0] ?? null;
      spotlight = {
        member: spotlightMember,
        quote: config.spotlightQuote,
        note: config.spotlightNote,
        linkedPursuit,
      };
    }
  }

  const stripMembers = spotlight
    ? sortedMembers.filter(
        (member) => member.characterId !== spotlight!.member.characterId,
      )
    : sortedMembers;

  const dynamics = buildPartyDynamicsProjection(
    sortedMembers,
    flatPages,
    campaignNow,
    isDMUser,
    config.tensionNotes,
  );

  return {
    config,
    members: stripMembers,
    spotlight,
    pursuits,
    dynamics,
    unmappedMemberCount,
  };
}

/** Pairwise connection labels between spotlight member and another roster member */
export function buildPairwiseConnectionLabels(
  fromCharacterId: string,
  toCharacterId: string,
  flatPages: readonly WikiPageLineageSnapshot[],
  campaignNow: ChronologyDateParts,
  isDMUser: boolean,
): string[] {
  const projection = buildCharacterConnectionProjection(
    toCharacterId,
    { viewerCharacterId: fromCharacterId },
    flatPages,
    campaignNow,
    isDMUser,
  );
  return projection.connectedThrough.map((entry) => entry.label);
}
