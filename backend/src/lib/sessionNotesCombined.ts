import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { extractWikiLinkTargetIdsFromBlocks } from './wikiLinkExtract.js';
import {
  parseSessionNoteMetadata,
  type SessionNoteMetadataFields,
} from './sessionNoteMetadata.js';
import { CampaignMemberRoles, WikiVisibility } from '../types/domain.js';
import {
  convertEpochToCalendarState,
  type FantasyCalendarLike,
} from './timeEngine.js';
import type {
  WikiBacklinkRow,
  WikiBrokenOutlinkRow,
  WikiOutlinkRow,
} from './wikiLinkService.js';

export interface SessionAuthorColumn {
  userId: string;
  label: string;
  displayName: string | null;
  playerContext: string;
  identityPageId: string | null;
  role: string;
  pageId: string | null;
  title: string;
  markdown: string;
  visibility: string;
  hasNotes: boolean;
  isDmRole: boolean;
  masked: boolean;
  createdAt: string;
  updatedAt: string;
  fantasyEpochMinute: string | null;
  sortKey: string;
}

export interface SessionEntityMention {
  pageId: string;
  title: string;
}

export interface CombinedSessionHeader {
  sessionGroupId: string;
  timelinePointId: string | null;
  anchorPageId: string | null;
  title: string;
  sequenceOrder: number | null;
  sessionCreatedAt: string;
  fantasyEpochMinute: string | null;
  fantasyDateLabel: string | null;
  locationPageId: string | null;
  locationTitle: string | null;
}

export interface CombinedSessionReferences {
  backlinks: WikiBacklinkRow[];
  outlinks: WikiOutlinkRow[];
  brokenOutlinks: WikiBrokenOutlinkRow[];
}

export interface CombinedSessionNotesResult {
  session: CombinedSessionHeader;
  columns: SessionAuthorColumn[];
  entitiesMentioned: SessionEntityMention[];
  referenceSourcePageIds: string[];
  references: CombinedSessionReferences;
}

function extractSessionNoteMarkdown(blocks: unknown): string {
  const rawBlocks: unknown[] = Array.isArray(blocks) ? blocks : [];
  const textBlock =
    rawBlocks.find(
      (block) =>
        block &&
        typeof block === 'object' &&
        (block as { id?: string }).id === 'session-note-body',
    ) ??
    rawBlocks.find(
      (block) =>
        block &&
        typeof block === 'object' &&
        (block as { type?: string }).type === 'text-tiptap',
    );
  const markdown =
    typeof (textBlock as { content?: { markdown?: unknown } } | undefined)?.content
      ?.markdown === 'string'
      ? ((textBlock as { content: { markdown: string } }).content.markdown as string)
      : '';
  return markdown.trim();
}

function isDmMemberRole(role: string): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
  );
}

function pageMatchesSessionGroup(
  metadata: unknown,
  sessionGroupId: string,
  timelinePointId: string | null,
): boolean {
  const parsed = parseSessionNoteMetadata(metadata);
  if (parsed.isSessionAnchor && !parsed.isSessionAuthor) return false;
  if (parsed.sessionGroupId === sessionGroupId) return true;
  if (timelinePointId && parsed.timelinePointId === timelinePointId) return true;
  return false;
}

function canViewPageVisibility(
  visibility: string,
  canManage: boolean,
): boolean {
  if (canManage) return true;
  return (
    visibility === WikiVisibility.PUBLIC || visibility === WikiVisibility.PARTY
  );
}

export function formatFantasyDateLabel(
  epochMinute: string | null | undefined,
  calendar: FantasyCalendarLike | null | undefined,
): string | null {
  if (!epochMinute?.trim() || !calendar) return null;
  try {
    const state = convertEpochToCalendarState(BigInt(epochMinute), calendar);
    const datePart = state.isIntercalary
      ? `${state.monthName} (intercalary)`
      : `${state.monthName} ${state.day}, Year ${state.year}`;
    return state.weekdayName ? `${state.weekdayName}, ${datePart}` : datePart;
  } catch {
    return null;
  }
}

export function buildColumnSortKey(
  fantasyEpochMinute: string | null,
  createdAt: string,
): string {
  return `${fantasyEpochMinute ?? ''}|${createdAt}`;
}

export async function resolveSessionGroupContext(
  campaignId: string,
  opts: { sessionGroupId?: string; timelinePointId?: string; pageId?: string },
): Promise<{
  sessionGroupId: string;
  timelinePointId: string | null;
  anchorPageId: string | null;
} | null> {
  if (opts.timelinePointId) {
    const tp = await (prisma as any).campaignSessionTimeline.findFirst({
      where: { id: opts.timelinePointId, campaignId },
      select: { id: true, wikiPageId: true },
    });
    if (!tp) return null;

    const anchorPage = await prisma.wikiPage.findFirst({
      where: { id: tp.wikiPageId, campaignId },
      select: { metadata: true },
    });
    const meta = parseSessionNoteMetadata(anchorPage?.metadata);
    const sessionGroupId = meta.sessionGroupId ?? tp.id;

    return {
      sessionGroupId,
      timelinePointId: tp.id,
      anchorPageId: tp.wikiPageId,
    };
  }

  if (opts.sessionGroupId) {
    const candidates = await prisma.wikiPage.findMany({
      where: { campaignId, templateType: 'SESSION_NOTE' },
      select: { id: true, metadata: true },
      take: 1000,
    });
    let timelinePointId: string | null = null;
    let anchorPageId: string | null = null;
    for (const page of candidates) {
      const meta = parseSessionNoteMetadata(page.metadata);
      if (meta.sessionGroupId !== opts.sessionGroupId) continue;
      if (meta.isSessionAnchor) {
        anchorPageId = page.id;
        timelinePointId = meta.timelinePointId ?? null;
        break;
      }
    }
    return {
      sessionGroupId: opts.sessionGroupId,
      timelinePointId,
      anchorPageId,
    };
  }

  if (opts.pageId) {
    const page = await prisma.wikiPage.findFirst({
      where: { id: opts.pageId, campaignId },
      select: { id: true, metadata: true },
    });
    if (!page) return null;

    const meta = parseSessionNoteMetadata(page.metadata);
    if (meta.sessionGroupId) {
      return resolveSessionGroupContext(campaignId, {
        sessionGroupId: meta.sessionGroupId,
        timelinePointId: meta.timelinePointId,
      });
    }
    if (meta.timelinePointId) {
      return resolveSessionGroupContext(campaignId, {
        timelinePointId: meta.timelinePointId,
      });
    }

    return {
      sessionGroupId: page.id,
      timelinePointId: null,
      anchorPageId: page.id,
    };
  }

  return null;
}

export async function loadSessionHeaderContext(
  campaignId: string,
  groupCtx: {
    sessionGroupId: string;
    timelinePointId: string | null;
    anchorPageId: string | null;
  },
  primaryCalendar: FantasyCalendarLike | null,
): Promise<CombinedSessionHeader> {
  let title = 'Session';
  let sequenceOrder: number | null = null;
  let sessionCreatedAt = new Date().toISOString();
  let locationPageId: string | null = null;
  let fantasyEpochMinute: string | null = null;

  if (groupCtx.anchorPageId) {
    const anchor = await prisma.wikiPage.findFirst({
      where: { id: groupCtx.anchorPageId, campaignId },
      select: { title: true, metadata: true },
    });
    if (anchor) {
      title = anchor.title;
      const meta = parseSessionNoteMetadata(anchor.metadata);
      locationPageId = meta.locationPageId ?? null;
      fantasyEpochMinute = meta.fantasyEpochMinute ?? null;
    }
  }

  if (groupCtx.timelinePointId) {
    const tp = await (prisma as any).campaignSessionTimeline.findFirst({
      where: { id: groupCtx.timelinePointId, campaignId },
      select: {
        sequenceOrder: true,
        createdAt: true,
        wikiPage: { select: { title: true, metadata: true } },
      },
    });
    if (tp) {
      sequenceOrder = tp.sequenceOrder;
      sessionCreatedAt = tp.createdAt.toISOString();
      if (tp.wikiPage?.title) title = tp.wikiPage.title;
      const meta = parseSessionNoteMetadata(tp.wikiPage?.metadata);
      locationPageId = meta.locationPageId ?? locationPageId;
      fantasyEpochMinute = meta.fantasyEpochMinute ?? fantasyEpochMinute;
    }
  }

  let locationTitle: string | null = null;
  if (locationPageId) {
    const loc = await prisma.wikiPage.findFirst({
      where: { id: locationPageId, campaignId },
      select: { title: true },
    });
    locationTitle = loc?.title ?? null;
  }

  return {
    sessionGroupId: groupCtx.sessionGroupId,
    timelinePointId: groupCtx.timelinePointId,
    anchorPageId: groupCtx.anchorPageId,
    title,
    sequenceOrder,
    sessionCreatedAt,
    fantasyEpochMinute,
    fantasyDateLabel: formatFantasyDateLabel(fantasyEpochMinute, primaryCalendar),
    locationPageId,
    locationTitle,
  };
}

export async function fetchAuthorPagesForSession(
  campaignId: string,
  sessionGroupId: string,
  timelinePointId: string | null,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<
  Array<{
    id: string;
    title: string;
    metadata: unknown;
    blocks: unknown;
    visibility: string;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
  const pages = await db.wikiPage.findMany({
    where: {
      campaignId,
      templateType: 'SESSION_NOTE',
    },
    select: {
      id: true,
      title: true,
      metadata: true,
      blocks: true,
      visibility: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return pages.filter((page) =>
    pageMatchesSessionGroup(page.metadata, sessionGroupId, timelinePointId),
  );
}

export function buildCombinedSessionNotes(params: {
  session: CombinedSessionHeader;
  canManage: boolean;
  members: Array<{
    userId: string;
    role: string;
    label: string;
    displayName: string | null;
    playerContext: string;
    identityPageId: string | null;
  }>;
  authorPages: Array<{
    id: string;
    title: string;
    metadata: unknown;
    blocks: unknown;
    visibility: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  pageTitlesById: Map<string, string>;
}): Omit<CombinedSessionNotesResult, 'references'> {
  const sessionFantasyEpoch = params.session.fantasyEpochMinute;

  const notesByAuthor = new Map<
    string,
    {
      pageId: string;
      title: string;
      markdown: string;
      visibility: string;
      blocks: unknown;
      createdAt: Date;
      updatedAt: Date;
      fantasyEpochMinute: string | null;
    }
  >();

  for (const page of params.authorPages) {
    const meta = parseSessionNoteMetadata(page.metadata);
    const authorId = meta.sessionNoteAuthorId;
    if (!authorId) continue;
    const canView = canViewPageVisibility(page.visibility, params.canManage);
    const columnFantasy =
      meta.fantasyEpochMinute ?? sessionFantasyEpoch ?? null;
    notesByAuthor.set(authorId, {
      pageId: page.id,
      title: page.title,
      markdown: canView ? extractSessionNoteMarkdown(page.blocks) : '',
      visibility: page.visibility,
      blocks: canView ? page.blocks : [],
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      fantasyEpochMinute: columnFantasy,
    });
  }

  const entityIds = new Set<string>();
  const referenceSourcePageIds: string[] = [];

  const columns: SessionAuthorColumn[] = params.members.map((member) => {
    const entry = notesByAuthor.get(member.userId);
    const isDmRole = isDmMemberRole(member.role);
    const isDmOnly = entry?.visibility === WikiVisibility.DM_ONLY;
    const masked = Boolean(entry && isDmOnly && !params.canManage);
    const hasNotes = !masked && (entry?.markdown ?? '').length > 0;

    if (entry && !masked) {
      referenceSourcePageIds.push(entry.pageId);
      const blocks = Array.isArray(entry.blocks)
        ? (entry.blocks as Array<Record<string, unknown>>)
        : [];
      for (const id of extractWikiLinkTargetIdsFromBlocks(blocks)) {
        entityIds.add(id);
      }
    }

    const createdAt = entry?.createdAt.toISOString() ?? '';
    const updatedAt = entry?.updatedAt.toISOString() ?? '';
    const fantasyEpochMinute = entry?.fantasyEpochMinute ?? null;

    return {
      userId: member.userId,
      label: member.label,
      displayName: member.displayName,
      playerContext: member.playerContext,
      identityPageId: member.identityPageId,
      role: member.role,
      pageId: entry?.pageId ?? null,
      title: entry?.title ?? '',
      markdown: masked ? '' : (entry?.markdown ?? ''),
      visibility: entry?.visibility ?? WikiVisibility.PARTY,
      hasNotes,
      isDmRole,
      masked,
      createdAt,
      updatedAt,
      fantasyEpochMinute,
      sortKey: buildColumnSortKey(fantasyEpochMinute, createdAt),
    };
  });

  const entitiesMentioned: SessionEntityMention[] = [];
  for (const pageId of entityIds) {
    const title = params.pageTitlesById.get(pageId);
    if (title) entitiesMentioned.push({ pageId, title });
  }
  entitiesMentioned.sort((a, b) => a.title.localeCompare(b.title));

  return {
    session: params.session,
    columns,
    entitiesMentioned,
    referenceSourcePageIds,
  };
}

export function anchorMetadataForTimeline(
  timelinePointId: string,
  authorId: string,
  fantasyEpochMinute?: string | null,
): SessionNoteMetadataFields {
  return {
    sessionGroupId: timelinePointId,
    timelinePointId,
    sessionNoteAuthorId: authorId,
    isSessionAnchor: true,
    ...(fantasyEpochMinute ? { fantasyEpochMinute } : {}),
  };
}

export function authorMetadataForSession(
  sessionGroupId: string,
  timelinePointId: string,
  authorId: string,
  fantasyEpochMinute?: string | null,
): SessionNoteMetadataFields {
  return {
    sessionGroupId,
    timelinePointId,
    sessionNoteAuthorId: authorId,
    isSessionAuthor: true,
    ...(fantasyEpochMinute ? { fantasyEpochMinute } : {}),
  };
}
