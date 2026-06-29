import { prisma } from './prisma.js';
import {
  parseCharacterMetadata,
  resolveCharacterStatus,
  type CharacterLifeStatus,
} from './characterMetadata.js';
import {
  formatPartyParticipationLabel,
  isActivePartyCharacter,
} from '../../../shared/partyParticipation.js';
import { parseCharacterLineageMetadata } from './characterLineageMetadata.js';
import { parseSessionNoteMetadata } from './sessionNoteMetadata.js';
import {
  isQuestMetadataPresent,
  parseQuestMetadata,
  type QuestStatus,
} from './questMetadata.js';
import { parseSceneMetadata } from './sceneMetadata.js';
import { buildCategoryIndexWhereClause } from './wikiCategoryEntityIndex.js';
import {
  batchSessionBacklinksForPages,
  isSessionLogSourcePage,
  type SessionPageBacklinkRow,
} from './sessionPageBacklinks.js';
import {
  buildWikiPageHref,
  isElevatedWikiRole,
  wikiLinkPeerVisibilityFilter,
} from './wikiLinkService.js';
import { buildContentSnippet } from './wikiCategories.js';
import { resolveMemorySnippet } from './sessionMentionSnippet.js';
import { compareWikiTitles } from './wikiSort.js';
import {
  buildCategoryLocationTrails,
  graphFromWikiPageRows,
} from './wikiCategoryLocationTrail.js';
import {
  buildPageDiscoveryMap,
  isPageVisibleToParty,
} from './discoveryProjectionService.js';
import { wikiPageVisibilityFilter } from './wikiTags.js';
import { CampaignMemberRoles } from '../types/domain.js';
import { isElevatedMembershipRole } from '../../../shared/campaignPolicy/membershipRoles.js';

function canManageNotebooks(role: string | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
  );
}

function hasElevatedView(role: string | null): boolean {
  return isElevatedMembershipRole(role);
}

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
  lifeStatus: CharacterLifeStatus;
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
  characters: Array<{ id: string; title: string; href: string }>;
}

export interface CharacterHubLocationCount {
  locationPageId: string | null;
  locationTitle: string;
  count: number;
}

export interface CharacterHubChild {
  id: string;
  title: string;
  parentId: string | null;
  visibility: string;
  updatedAt: string;
  snippet: string;
  type?: string;
  entityCategory?: string | null;
  presenceState?: string;
  metadata?: unknown;
  isCrossNested?: boolean;
  locationAncestors?: unknown[];
  locationTrailLabel?: string | null;
}

export interface CharacterHubPayload {
  category: {
    id: string;
    title: string;
    isIndexCategory: boolean;
  };
  children: CharacterHubChild[];
  discoverySummary: { discoveredCount: number; undiscoveredCount: number } | null;
  latestSession: CharacterHubLatestSession | null;
  recentlySeenBySession: CharacterHubRecentlySeenSession[];
  locationCounts: CharacterHubLocationCount[];
  characterContext: Record<string, CharacterCastContext>;
  previewAsPlayer?: boolean;
}

const ACTIVE_QUEST_STATUSES = new Set<QuestStatus>(['ACTIVE', 'AVAILABLE']);
const UNKNOWN_LOCATION = 'Unknown';

function resolveTitle(
  titleById: Map<string, string>,
  pageId: string | null,
  fallback = UNKNOWN_LOCATION,
): string {
  if (!pageId) return fallback;
  return titleById.get(pageId) ?? fallback;
}

function buildIdentityLine(
  identity: ReturnType<typeof parseCharacterMetadata>,
  affiliationTitle: string | null,
): string | null {
  const role =
    identity.profession?.trim() ||
    identity.title?.trim() ||
    null;
  if (role && affiliationTitle) return `${role} · ${affiliationTitle}`;
  return role ?? affiliationTitle;
}

function sessionRowToRef(
  row: SessionPageBacklinkRow,
): { sessionId: string; sessionTitle: string; href: string } {
  return {
    sessionId: row.timelinePointId ?? row.id,
    sessionTitle: row.breadcrumbLabel ?? row.title,
    href: row.href ?? '#',
  };
}

export function resolveKnownThrough(input: {
  characterId: string;
  activeQuests: CharacterHubLinkRef[];
  lastSeen: SessionPageBacklinkRow | null;
}): CharacterKnownThroughRef | null {
  if (input.activeQuests.length > 0) {
    const quest = input.activeQuests[0];
    return {
      kind: 'quest',
      id: quest.id,
      title: quest.title,
      href: quest.href,
    };
  }
  if (input.lastSeen) {
    return {
      kind: 'session',
      id: input.lastSeen.timelinePointId ?? input.lastSeen.id,
      title: input.lastSeen.breadcrumbLabel ?? input.lastSeen.title,
      href: input.lastSeen.href ?? '#',
    };
  }
  return null;
}

export function resolvePresenceTier(input: {
  mentionedInLatestSession: boolean;
  atLatestSessionLocation: boolean;
  seenInRecentSessions: boolean;
}): CharacterPresenceTier {
  if (input.mentionedInLatestSession || input.atLatestSessionLocation) {
    return 'active';
  }
  if (input.seenInRecentSessions) return 'recent';
  return 'dormant';
}

export function buildLocationCounts(
  characterContexts: Map<string, CharacterCastContext>,
): CharacterHubLocationCount[] {
  const counts = new Map<string, CharacterHubLocationCount>();
  for (const ctx of characterContexts.values()) {
    const key = ctx.locationPageId ?? '__unknown__';
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, {
        locationPageId: ctx.locationPageId,
        locationTitle: ctx.locationTitle,
        count: 1,
      });
    }
  }
  return [...counts.values()].sort((a, b) => {
    if (a.locationPageId === null) return 1;
    if (b.locationPageId === null) return -1;
    if (b.count !== a.count) return b.count - a.count;
    return a.locationTitle.localeCompare(b.locationTitle);
  });
}

export function buildCoSeenMap(input: {
  characterIds: Set<string>;
  sessionSources: Array<{ sourceId: string; characterIds: string[]; sortKey: number }>;
}): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const id of input.characterIds) {
    result.set(id, []);
  }

  const sortedSources = [...input.sessionSources].sort(
    (a, b) => b.sortKey - a.sortKey,
  );

  for (const source of sortedSources) {
    const chars = source.characterIds.filter((id) => input.characterIds.has(id));
    if (chars.length < 2) continue;
    for (const charId of chars) {
      const bucket = result.get(charId) ?? [];
      for (const otherId of chars) {
        if (otherId === charId) continue;
        if (!bucket.includes(otherId)) bucket.push(otherId);
      }
      result.set(charId, bucket);
    }
  }

  return result;
}

export function resolveCharacterHubEffectiveView(input: {
  role: string | null;
  previewAsPlayer?: boolean;
}): {
  canManage: boolean;
  isElevated: boolean;
  previewAsPlayer: boolean;
} {
  const canManage = canManageNotebooks(input.role);
  const previewAsPlayer = Boolean(input.previewAsPlayer) && canManage;
  return {
    canManage: canManage && !previewAsPlayer,
    isElevated: isElevatedWikiRole(input.role) && !previewAsPlayer,
    previewAsPlayer,
  };
}

export async function loadCharacterHubPayload(input: {
  campaignId: string;
  campaignHandle: string;
  categoryPageId: string;
  role: string | null;
  previewAsPlayer?: boolean;
}): Promise<CharacterHubPayload | null> {
  const { canManage, isElevated, previewAsPlayer } = resolveCharacterHubEffectiveView(
    input,
  );
  const visibilityWhere = wikiPageVisibilityFilter(isElevated);
  const peerVisibility = wikiLinkPeerVisibilityFilter(isElevated);

  const category = await prisma.wikiPage.findFirst({
    where: { id: input.categoryPageId, campaignId: input.campaignId },
    select: {
      id: true,
      title: true,
      parentId: true,
      visibility: true,
      updatedAt: true,
      metadata: true,
      blocks: true,
      templateType: true,
    },
  });

  if (!category || category.title !== 'Characters') {
    return null;
  }

  const [children, graphRows, timelineRows, questAndScenePages] =
    await Promise.all([
      prisma.wikiPage.findMany({
        where: {
          campaignId: input.campaignId,
          id: { not: input.categoryPageId },
          ...buildCategoryIndexWhereClause(category.title, input.categoryPageId),
          ...(visibilityWhere ?? {}),
        },
        select: {
          id: true,
          title: true,
          parentId: true,
          visibility: true,
          updatedAt: true,
          templateType: true,
          metadata: true,
          blocks: true,
          workspace: true,
          pathKey: true,
        },
      }),
      prisma.wikiPage.findMany({
        where: { campaignId: input.campaignId },
        select: {
          id: true,
          title: true,
          parentId: true,
          templateType: true,
          metadata: true,
        },
      }),
      (prisma as any).campaignSessionTimeline.findMany({
        where: { campaignId: input.campaignId },
        orderBy: { sequenceOrder: 'desc' },
        select: {
          id: true,
          sequenceOrder: true,
          wikiPage: {
            select: {
              id: true,
              title: true,
              metadata: true,
              updatedAt: true,
              visibility: true,
              templateType: true,
            },
          },
        },
      }),
      prisma.wikiPage.findMany({
        where: {
          campaignId: input.campaignId,
          OR: [{ templateType: 'QUEST' }, { templateType: 'SCENE' }],
          ...(peerVisibility ?? {}),
        },
        select: {
          id: true,
          title: true,
          templateType: true,
          metadata: true,
          workspace: true,
          pathKey: true,
        },
      }),
    ]);

  children.sort((a, b) => compareWikiTitles(a.title, b.title, category.title));

  const titleById = new Map(graphRows.map((p) => [p.id, p.title]));
  const characterIds = new Set(children.map((c) => c.id));

  const graph = graphFromWikiPageRows(graphRows);
  const locationTrails = buildCategoryLocationTrails(
    children,
    category.id,
    graph,
  );

  const presenceMap = await buildPageDiscoveryMap(
    input.campaignId,
    children.map((child) => child.id),
  );

  const visibleChildren = canManage
    ? children
    : children.filter((child) =>
        isPageVisibleToParty(presenceMap, child.id, input.role ?? null),
      );

  const characterIdList = visibleChildren.map((c) => c.id);
  const sessionBacklinks = await batchSessionBacklinksForPages({
    campaignId: input.campaignId,
    campaignHandle: input.campaignHandle,
    targetPageIds: characterIdList,
    role: input.role,
    limitPerTarget: 5,
  });

  const parentById = new Map(
    graphRows.map((p) => [
      p.id,
      { id: p.id, title: p.title, parentId: p.parentId, metadata: p.metadata },
    ]),
  );

  const sessionLinks = await prisma.wikiLink.findMany({
    where: {
      campaignId: input.campaignId,
      targetPageId: { in: characterIdList },
      sourcePage: {
        campaignId: input.campaignId,
        ...(peerVisibility ?? {}),
      },
    },
    select: {
      sourcePageId: true,
      targetPageId: true,
      sourcePage: {
        select: {
          id: true,
          title: true,
          parentId: true,
          templateType: true,
          metadata: true,
          updatedAt: true,
        },
      },
    },
  });

  const sessionSourceMentions = new Map<
    string,
    { characterIds: string[]; sortKey: number }
  >();

  for (const link of sessionLinks) {
    if (!characterIds.has(link.targetPageId)) continue;
    if (!isSessionLogSourcePage(link.sourcePage, parentById)) continue;
    const existing = sessionSourceMentions.get(link.sourcePageId);
    if (existing) {
      if (!existing.characterIds.includes(link.targetPageId)) {
        existing.characterIds.push(link.targetPageId);
      }
    } else {
      sessionSourceMentions.set(link.sourcePageId, {
        characterIds: [link.targetPageId],
        sortKey: link.sourcePage.updatedAt.getTime(),
      });
    }
  }

  const coSeenMap = buildCoSeenMap({
    characterIds,
    sessionSources: [...sessionSourceMentions.entries()].map(
      ([sourceId, value]) => ({
        sourceId,
        characterIds: value.characterIds,
        sortKey: value.sortKey,
      }),
    ),
  });

  const questInvolvement = new Map<string, CharacterHubLinkRef[]>();
  for (const id of characterIdList) {
    questInvolvement.set(id, []);
  }

  for (const page of questAndScenePages) {
    if (page.templateType === 'QUEST' && isQuestMetadataPresent(page.metadata)) {
      const questMeta = parseQuestMetadata(page.metadata);
      if (!ACTIVE_QUEST_STATUSES.has(questMeta.questStatus)) continue;
      const ref: CharacterHubLinkRef = {
        id: page.id,
        title: page.title,
        href: buildWikiPageHref(input.campaignHandle, page),
      };
      if (questMeta.questGiverId && questInvolvement.has(questMeta.questGiverId)) {
        questInvolvement.get(questMeta.questGiverId)!.push(ref);
      }
    }
    if (page.templateType === 'SCENE') {
      const sceneMeta = parseSceneMetadata(page.metadata);
      const ref: CharacterHubLinkRef = {
        id: page.id,
        title: page.title,
        href: buildWikiPageHref(input.campaignHandle, page),
      };
      for (const participantId of sceneMeta.participantPageIds) {
        if (!questInvolvement.has(participantId)) continue;
        const linkedQuestIds = sceneMeta.linkedQuestPageIds ?? [];
        for (const questId of linkedQuestIds) {
          const questPage = questAndScenePages.find((p) => p.id === questId);
          if (!questPage || !isQuestMetadataPresent(questPage.metadata)) continue;
          const questMeta = parseQuestMetadata(questPage.metadata);
          if (!ACTIVE_QUEST_STATUSES.has(questMeta.questStatus)) continue;
          const questRef: CharacterHubLinkRef = {
            id: questPage.id,
            title: questPage.title,
            href: buildWikiPageHref(input.campaignHandle, questPage),
          };
          const bucket = questInvolvement.get(participantId)!;
          if (!bucket.some((q) => q.id === questRef.id)) {
            bucket.push(questRef);
          }
        }
        if (linkedQuestIds.length === 0 && sceneMeta.participantPageIds.length) {
          const bucket = questInvolvement.get(participantId)!;
          if (!bucket.some((q) => q.id === ref.id)) {
            bucket.push(ref);
          }
        }
      }
    }
  }

  let latestSession: CharacterHubLatestSession | null = null;
  const recentSessionIds = new Set<string>();

  for (const row of timelineRows as Array<{
    id: string;
    sequenceOrder: number;
    wikiPage: {
      id: string;
      title: string;
      metadata: unknown;
      updatedAt: Date;
      visibility: string;
      templateType: string;
    } | null;
  }>) {
    const anchor = row.wikiPage;
    if (!anchor) continue;
    if (
      !canManage &&
      anchor.visibility !== 'PUBLIC' &&
      anchor.visibility !== 'PARTY'
    ) {
      continue;
    }

    const anchorMeta = parseSessionNoteMetadata(anchor.metadata);
    const timelinePointId = row.id;
    const href = `/campaigns/${input.campaignHandle}/notes/${timelinePointId}`;
    const locationPageId = anchorMeta.locationPageId ?? null;

    const mentionedCharacterIds = characterIdList.filter((charId) => {
      const backlinks = sessionBacklinks.get(charId) ?? [];
      return backlinks.some(
        (b) =>
          b.timelinePointId === timelinePointId ||
          b.id === anchor.id,
      );
    });

    if (!latestSession) {
      latestSession = {
        id: timelinePointId,
        title: anchor.title,
        locationPageId,
        locationTitle: locationPageId
          ? resolveTitle(titleById, locationPageId, UNKNOWN_LOCATION)
          : null,
        href,
        mentionedCharacterIds,
      };
    }

    if (recentSessionIds.size < 5) {
      recentSessionIds.add(timelinePointId);
    }
  }

  const recentSessionIdList = [...recentSessionIds];
  const characterContextMap = new Map<string, CharacterCastContext>();

  const lastSeenSourcePageIds = new Set<string>();
  for (const child of visibleChildren) {
    const backlinks = sessionBacklinks.get(child.id) ?? [];
    const lastSeenRow = backlinks[0];
    if (lastSeenRow?.id) lastSeenSourcePageIds.add(lastSeenRow.id);
  }

  const sessionBlocksByPageId = new Map<string, unknown>();
  if (lastSeenSourcePageIds.size > 0) {
    const sessionPages = await prisma.wikiPage.findMany({
      where: {
        campaignId: input.campaignId,
        id: { in: [...lastSeenSourcePageIds] },
      },
      select: { id: true, blocks: true },
    });
    for (const page of sessionPages) {
      sessionBlocksByPageId.set(page.id, page.blocks);
    }
  }

  for (const child of visibleChildren) {
    const identity = parseCharacterMetadata(child.metadata);
    const lineage = parseCharacterLineageMetadata(child.metadata);
    const lifeStatus = resolveCharacterStatus(identity, lineage);
    const locationPageId = identity.currentLocationId;
    const locationTitle = resolveTitle(titleById, locationPageId, UNKNOWN_LOCATION);
    const affiliationTitle = identity.primaryAffiliationId
      ? resolveTitle(titleById, identity.primaryAffiliationId, '')
      : null;

    const backlinks = sessionBacklinks.get(child.id) ?? [];
    const lastSeenRow = backlinks[0] ?? null;
    const lastSeen = lastSeenRow ? sessionRowToRef(lastSeenRow) : null;

    const activeQuests = questInvolvement.get(child.id) ?? [];
    const knownThrough = resolveKnownThrough({
      characterId: child.id,
      activeQuests,
      lastSeen: lastSeenRow,
    });

    const mentionedInLatestSession = Boolean(
      latestSession?.mentionedCharacterIds.includes(child.id),
    );
    const atLatestSessionLocation = Boolean(
      latestSession?.locationPageId &&
        latestSession.locationPageId === locationPageId,
    );
    const seenInRecentSessions = backlinks.some((row) => {
      const sessionId = row.timelinePointId ?? row.id;
      return recentSessionIdList.includes(sessionId);
    });

    const coSeenIds = (coSeenMap.get(child.id) ?? []).slice(0, 3);
    const coSeenWith = coSeenIds.map((id) => ({
      id,
      title: resolveTitle(titleById, id, id),
    }));

    const sessionBlocks = lastSeenRow?.id
      ? (sessionBlocksByPageId.get(lastSeenRow.id) as
          | Array<Record<string, unknown>>
          | undefined)
      : undefined;
    const memorySnippet = resolveMemorySnippet({
      sessionBlocks,
      characterPageId: child.id,
      knownFor: identity.knownFor,
    });

    characterContextMap.set(child.id, {
      locationPageId,
      locationTitle,
      portraitUrl: identity.appearance.portraitUrl,
      identityLine: buildIdentityLine(
        identity,
        affiliationTitle && affiliationTitle.length > 0 ? affiliationTitle : null,
      ),
      lifeStatus,
      presenceTier: resolvePresenceTier({
        mentionedInLatestSession,
        atLatestSessionLocation,
        seenInRecentSessions,
      }),
      mentionedInLatestSession,
      lastSeen,
      knownThrough,
      activeQuests,
      coSeenWith,
      memorySnippet,
      isPartyMember: isActivePartyCharacter(child.metadata),
      partyRoleLabel: formatPartyParticipationLabel(identity.partyParticipation),
      primaryAffiliationId: identity.primaryAffiliationId,
      primaryAffiliationTitle:
        affiliationTitle && affiliationTitle.length > 0 ? affiliationTitle : null,
    });
  }

  const recentlySeenBySession: CharacterHubRecentlySeenSession[] = [];
  for (const sessionId of recentSessionIdList) {
    const timelineRow = (timelineRows as Array<{
      id: string;
      wikiPage: { id: string; title: string } | null;
    }>).find((row) => row.id === sessionId);
    const sessionTitle = timelineRow?.wikiPage?.title ?? 'Session';
    const href = `/campaigns/${input.campaignHandle}/notes/${sessionId}`;
    const sessionCharacters = visibleChildren
      .filter((child) => {
        const backlinks = sessionBacklinks.get(child.id) ?? [];
        return backlinks.some(
          (b) => b.timelinePointId === sessionId || b.id === timelineRow?.wikiPage?.id,
        );
      })
      .map((child) => ({
        id: child.id,
        title: child.title,
        href: buildWikiPageHref(input.campaignHandle, child),
      }));
    if (sessionCharacters.length > 0) {
      recentlySeenBySession.push({
        sessionId,
        sessionTitle,
        href,
        characters: sessionCharacters,
      });
    }
  }

  const discoverySummary = canManage
    ? null
    : {
        discoveredCount: visibleChildren.length,
        undiscoveredCount: Math.max(
          0,
          children.length - visibleChildren.length,
        ),
      };

  return {
    category: {
      id: category.id,
      title: category.title,
      isIndexCategory: true,
    },
    children: visibleChildren.map((child) => {
      const trail = locationTrails.get(child.id);
      const presenceState = presenceMap.get(child.id) ?? 'REVEALED';
      return {
        id: child.id,
        title: child.title,
        parentId: child.parentId,
        visibility: child.visibility,
        updatedAt: child.updatedAt.toISOString(),
        type: child.templateType,
        metadata: child.metadata ?? undefined,
        snippet: canManage
          ? buildContentSnippet(
              (Array.isArray(child.blocks)
                ? child.blocks
                : []) as unknown as Parameters<typeof buildContentSnippet>[0],
            )
          : '',
        isCrossNested: trail?.isCrossNested ?? false,
        locationAncestors: trail?.locationAncestors ?? [],
        locationTrailLabel: trail?.locationTrailLabel ?? null,
        presenceState: canManage ? presenceState : undefined,
      };
    }),
    discoverySummary,
    latestSession,
    recentlySeenBySession,
    locationCounts: buildLocationCounts(characterContextMap),
    characterContext: Object.fromEntries(characterContextMap),
    previewAsPlayer: previewAsPlayer || undefined,
  };
}
