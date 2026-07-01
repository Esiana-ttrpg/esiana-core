import { buildEntityCategoryWhereClause } from './wikiCategoryEntityIndex.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';
import type { DashboardConfig } from './dashboardConfig.js';
import type { DashboardSummary } from './buildDashboardSummary.js';
import {
  buildDashboardChronometer,
  formatChronometerStatusLabel,
} from './buildDashboardChronometer.js';
import {
  fetchNextDashboardSession,
  type DashboardSessionSummary,
} from './buildDashboardSessions.js';
import {
  buildDashboardQuestLedgerEntries,
  type DashboardQuestLedgerEntry,
} from './dashboardQuestLedger.js';
import {
  buildDashboardThreadBundle,
  type DashboardOpenThreadEntry,
} from './dashboardThreadLedger.js';
import { buildContentSnippet } from './wikiCategories.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import { parseCharacterMetadata } from './characterMetadata.js';
import { isActivePartyCharacter } from '../../../shared/partyParticipation.js';
import { canViewWikiPage } from './wikiTree.js';
import { buildArcIdentity } from './buildHubNarrativeLabels.js';
import { campaignPath, campaignThreadsHubPath } from './notifications/deepLinks.js';
import type { DashboardThreadBundle } from './dashboardThreadLedger.js';
import type { RecentEntityFeedItem } from './recentEntityFeedTypes.js';

export type NarrativeSnapshotFact = {
  label: string;
  value: string;
  href?: string | null;
  emptyPrompt?: string | null;
};

export type NarrativeSnapshotStoryBeat = {
  id: string;
  title: string;
  href: string;
  statusLabel?: string | null;
  roleLabel: string;
};

export type NarrativeSnapshotPartyMember = {
  id: string;
  title: string;
  href: string;
  tagline: string | null;
};

export type NarrativeSnapshotActivityItem = {
  id: string;
  title: string;
  href: string | null;
  updatedAt: string;
  reason?: string | null;
};

export type NarrativeSnapshotDeepSystems = {
  worldPressure?: {
    levelLabel: string;
    summaryLines: string[];
    href: string;
  };
  threadSummaries?: Array<{ id: string; title: string; href: string; statusLabel: string }>;
  continuityDigest?: Array<{ label: string; count: number; href?: string }>;
};

export type CampaignNarrativeSnapshot = {
  campaignState: {
    calendarDate: NarrativeSnapshotFact;
    nextSession: NarrativeSnapshotFact;
    partySummary: NarrativeSnapshotFact & { count: number };
    location: NarrativeSnapshotFact;
  };
  currentStory: {
    arcTitle: string | null;
    arcProse: string | null;
    activeQuest: NarrativeSnapshotStoryBeat | null;
    activeThread: NarrativeSnapshotStoryBeat | null;
    emptyPrompt?: string | null;
    adventureHref: string;
  };
  partyRoster: {
    members: NarrativeSnapshotPartyMember[];
    emptyPrompt?: string | null;
    href: string;
  };
  recentActivity: {
    items: NarrativeSnapshotActivityItem[];
    viewAllHref: string;
    emptyMessage: string;
  };
  deepSystems: NarrativeSnapshotDeepSystems | null;
};

function isDmRole(role: CampaignMemberRole | null): boolean {
  return role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER;
}

function formatSessionDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatScheduleCadence(summary: DashboardSummary): string | null {
  const { schedule } = summary;
  const parts: string[] = [];
  if (schedule.frequency?.trim()) parts.push(schedule.frequency.trim());
  if (schedule.day?.trim() && schedule.time?.trim()) {
    parts.push(`${schedule.day.trim()} ${schedule.time.trim()}`);
  } else if (schedule.day?.trim()) {
    parts.push(schedule.day.trim());
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

function resolveNextSessionFact(
  campaignHandle: string,
  nextSession: DashboardSessionSummary | null,
  summary: DashboardSummary,
): NarrativeSnapshotFact {
  const settingsHref = campaignPath(campaignHandle, 'settings');
  if (nextSession?.plannedStartAt) {
    const formatted = formatSessionDate(nextSession.plannedStartAt);
    const title = nextSession.title?.trim();
    const value =
      formatted && title ? `${formatted} — ${title}` : formatted ?? title ?? 'Scheduled';
    return {
      label: 'Next Session',
      value,
      href: campaignPath(campaignHandle, 'notes'),
    };
  }
  const cadence = formatScheduleCadence(summary);
  if (cadence) {
    return {
      label: 'Next Session',
      value: cadence,
      href: settingsHref,
    };
  }
  return {
    label: 'Next Session',
    value: 'No session scheduled',
    emptyPrompt: 'Add a session in schedule settings',
    href: settingsHref,
  };
}

function pickActiveQuest(
  quests: DashboardQuestLedgerEntry[],
): DashboardQuestLedgerEntry | null {
  const open = quests.filter(
    (q) => q.questStatus === 'ACTIVE' || q.questStatus === 'AVAILABLE',
  );
  const main = open.find((q) => {
    const meta = q.metadata as Record<string, unknown> | null;
    return meta?.questType === 'main';
  });
  return main ?? open[0] ?? null;
}

function pickEscalatingThread(
  bundle: DashboardThreadBundle,
): DashboardOpenThreadEntry | null {
  const living = bundle.living;
  if (living.length === 0) return null;
  const open = living.find((t) => t.threadStatus === 'OPEN');
  if (open) return open;
  return living[0];
}

function truncateProse(text: string, maxLen = 320): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLen) return normalized;
  const slice = normalized.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > 80 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

function resolveArcProse(input: {
  arcSnippet: string | null;
  questSnippet: string | null;
  heroSummary: string | null;
  tensionLine: string | null;
  description: string | null;
}): string | null {
  if (input.arcSnippet?.trim()) return truncateProse(input.arcSnippet);
  if (input.questSnippet?.trim()) return truncateProse(input.questSnippet);
  if (input.heroSummary?.trim()) {
    const sentences = input.heroSummary.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
    if (sentences.length > 1) {
      return truncateProse(sentences.slice(1).join('. ') + '.');
    }
    return truncateProse(input.heroSummary);
  }
  if (input.tensionLine?.trim()) return truncateProse(input.tensionLine);
  if (input.description?.trim()) return truncateProse(input.description);
  return null;
}

async function loadPartyRoster(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
): Promise<NarrativeSnapshotPartyMember[]> {
  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null, ...buildEntityCategoryWhereClause('characters') },
    select: {
      id: true,
      title: true,
      visibility: true,
      metadata: true,
      workspace: true,
      pathKey: true,
    },
    orderBy: [{ title: 'asc' }, { id: 'asc' }],
  });

  const members: NarrativeSnapshotPartyMember[] = [];
  for (const page of pages) {
    if (!canViewWikiPage(page.visibility, role)) continue;
    if (!isActivePartyCharacter(page.metadata)) continue;
    const identity = parseCharacterMetadata(page.metadata);
    const tagline =
      identity.profession?.trim() ||
      identity.activeArc?.trim() ||
      identity.motivation?.trim() ||
      null;
    members.push({
      id: page.id,
      title: page.title,
      href: buildWikiPageHref(campaignHandle, page),
      tagline,
    });
  }
  return members.slice(0, 8);
}

async function resolveLocationFact(
  campaignId: string,
  campaignHandle: string,
  dashboardConfig: DashboardConfig,
  role: CampaignMemberRole | null,
): Promise<NarrativeSnapshotFact> {
  const locationsHref = campaignPath(campaignHandle, 'wiki');
  const visit = await prisma.partyRegionVisit.findFirst({
    where: { campaignId },
    orderBy: { visitedAtEpochMinute: 'desc' },
    select: { locationPageId: true },
  });

  const candidateIds: string[] = [];
  if (visit?.locationPageId) candidateIds.push(visit.locationPageId);
  const startingId = dashboardConfig.importManifest?.startingLocationPageId;
  if (startingId) candidateIds.push(startingId);

  for (const pageId of candidateIds) {
    const page = await prisma.wikiPage.findFirst({
      where: { campaignId, id: pageId, deletedAt: null },
      select: { id: true, title: true, visibility: true, workspace: true, pathKey: true },
    });
    if (page && canViewWikiPage(page.visibility, role)) {
      return {
        label: 'Current Location',
        value: page.title,
        href: buildWikiPageHref(campaignHandle, page),
      };
    }
  }

  return {
    label: 'Current Location',
    value: 'Location not set',
    emptyPrompt: 'Mark where the party is in Locations',
    href: locationsHref,
  };
}

export async function buildCampaignNarrativeSnapshot(input: {
  campaignId: string;
  campaignHandle: string;
  role: CampaignMemberRole | null;
  dashboardConfig: DashboardConfig;
  summary: DashboardSummary;
  questPages: DashboardQuestLedgerEntry[];
  threadBundle: DashboardThreadBundle;
  campaignDescription: string | null;
}): Promise<CampaignNarrativeSnapshot> {
  const {
    campaignId,
    campaignHandle,
    role,
    dashboardConfig,
    summary,
    questPages,
    threadBundle,
    campaignDescription,
  } = input;

  const [chronometer, nextSession, partyMembers, locationFact] = await Promise.all([
    buildDashboardChronometer(campaignId),
    fetchNextDashboardSession(campaignId),
    loadPartyRoster(campaignId, campaignHandle, role),
    resolveLocationFact(campaignId, campaignHandle, dashboardConfig, role),
  ]);

  const calendarLabel = formatChronometerStatusLabel(chronometer);
  const calendarDate: NarrativeSnapshotFact = calendarLabel
    ? {
        label: 'Current Date',
        value: chronometer?.label ?? calendarLabel,
        href: campaignPath(campaignHandle, 'chronology'),
      }
    : {
        label: 'Current Date',
        value: 'World date not set',
        emptyPrompt: 'Configure your fantasy calendar',
        href: campaignPath(campaignHandle, 'settings'),
      };

  const partyCount = partyMembers.length;
  const memberCountFallback = summary.party.members.length;
  const displayCount = partyCount > 0 ? partyCount : memberCountFallback;
  const partySummary: NarrativeSnapshotFact & { count: number } = {
    label: 'Party',
    count: displayCount,
    value:
      partyCount > 0
        ? `${partyCount} ${partyCount === 1 ? 'Character' : 'Characters'}`
        : displayCount > 0
          ? `${displayCount} ${displayCount === 1 ? 'player' : 'players'} at the table`
          : 'No party yet',
    href: campaignPath(campaignHandle, 'party'),
    emptyPrompt: partyCount === 0 ? 'Add characters in the codex' : null,
  };

  const activeQuest = pickActiveQuest(questPages);
  const activeThread = pickEscalatingThread(threadBundle);
  const hero = dashboardConfig.hero;
  const arcIdentity = buildArcIdentity({
    heroCurrentArc: hero.currentArc ?? null,
    heroSummary: hero.summary,
    topThreadTitle: activeThread?.title ?? null,
    topQuestTitle: activeQuest?.title ?? null,
    recruitmentTagline: null,
    description: campaignDescription,
    lastSessionSnippet: summary.lastSession?.snippet ?? null,
    attentionItems: [],
    recentEditTitles: summary.recent.items.slice(0, 3).map((i) => i.title),
  });

  let arcPageSnippet: string | null = null;
  const arcPages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null, templateType: 'ARC' },
    select: { title: true, metadata: true, blocks: true },
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    take: 8,
  });
  const arcTitleNeedle = arcIdentity.currentArc?.replace(/^Arc:\s*/i, '').trim().toLowerCase();
  const arcPage =
    arcPages.find((p) => {
      const meta = p.metadata as Record<string, unknown> | null;
      const kind = meta && typeof meta.arcKind === 'string' ? meta.arcKind : '';
      return kind === 'campaign_arc';
    }) ??
    (arcTitleNeedle
      ? arcPages.find((p) => p.title.toLowerCase().includes(arcTitleNeedle))
      : null) ??
    arcPages[0];
  if (arcPage?.blocks) {
    arcPageSnippet = buildContentSnippet(
      arcPage.blocks as unknown as Parameters<typeof buildContentSnippet>[0],
    );
  }

  const arcProse = resolveArcProse({
    arcSnippet: arcPageSnippet,
    questSnippet: activeQuest?.snippet ?? null,
    heroSummary: hero.summary,
    tensionLine: arcIdentity.tensionLine,
    description: campaignDescription,
  });

  const adventureHref = campaignPath(campaignHandle, 'wiki');
  const questBeat: NarrativeSnapshotStoryBeat | null = activeQuest
    ? {
        id: activeQuest.id,
        title: activeQuest.title,
        href: buildWikiPageHref(campaignHandle, activeQuest),
        statusLabel: activeQuest.questStatus,
        roleLabel: 'Active Quest',
      }
    : null;
  const threadBeat: NarrativeSnapshotStoryBeat | null = activeThread
    ? {
        id: activeThread.id,
        title: activeThread.title,
        href: buildWikiPageHref(campaignHandle, activeThread.id),
        statusLabel: activeThread.threadStatus,
        roleLabel:
          activeThread.threadStatus === 'OPEN' ? 'Escalating Thread' : 'Active Thread',
      }
    : null;

  const hasStory = Boolean(arcIdentity.currentArc || questBeat || threadBeat);
  const recentItems: NarrativeSnapshotActivityItem[] = summary.recent.items
    .slice(0, 5)
    .map((item: RecentEntityFeedItem) => ({
      id: item.entityId,
      title: item.title,
      href: item.href,
      updatedAt: item.updatedAt,
      reason: item.reason ?? item.freshnessLabel ?? null,
    }));

  let deepSystems: NarrativeSnapshotDeepSystems | null = null;
  const escalatingCount = threadBundle.living.filter((t) => t.threadStatus === 'OPEN').length;
  const dormantCount = threadBundle.living.filter((t) => t.threadStatus === 'DORMANT').length;

  if (
    threadBundle.living.length > 0 ||
    (isDmRole(role) && (summary.dmOverlay?.openUnresolvedCount ?? 0) > 0)
  ) {
    deepSystems = {};
    if (escalatingCount > 0 || dormantCount > 0) {
      const lines: string[] = [];
      if (escalatingCount > 0) {
        lines.push(
          `${escalatingCount} escalating ${escalatingCount === 1 ? 'thread' : 'threads'}`,
        );
      }
      if (dormantCount > 0) {
        lines.push(
          `${dormantCount} dormant ${dormantCount === 1 ? 'threat' : 'threats'} awakening`,
        );
      }
      deepSystems.worldPressure = {
        levelLabel: escalatingCount > 0 ? 'Threat Level: Rising' : 'Threat Level: Watchful',
        summaryLines: lines,
        href: campaignThreadsHubPath(campaignHandle),
      };
    }
    if (threadBundle.living.length > 1) {
      deepSystems.threadSummaries = threadBundle.living.slice(0, 4).map((t) => ({
        id: t.id,
        title: t.title,
        href: buildWikiPageHref(campaignHandle, t.id),
        statusLabel: t.threadStatus,
      }));
    }
    if (isDmRole(role) && summary.dmOverlay) {
      const digest: NarrativeSnapshotDeepSystems['continuityDigest'] = [];
      if (summary.dmOverlay.openUnresolvedCount > 0) {
        digest.push({
          label: 'unresolved references',
          count: summary.dmOverlay.openUnresolvedCount,
          href: campaignPath(campaignHandle, 'wiki', 'maintenance'),
        });
      }
      if (digest.length > 0) {
        deepSystems.continuityDigest = digest;
      }
    }
    if (Object.keys(deepSystems).length === 0) {
      deepSystems = null;
    }
  }

  return {
    campaignState: {
      calendarDate,
      nextSession: resolveNextSessionFact(campaignHandle, nextSession, summary),
      partySummary,
      location: locationFact,
    },
    currentStory: {
      arcTitle: arcIdentity.currentArc,
      arcProse,
      activeQuest: questBeat,
      activeThread: threadBeat,
      emptyPrompt: hasStory ? null : 'Start your story in Adventure',
      adventureHref,
    },
    partyRoster: {
      members: partyMembers,
      emptyPrompt: partyMembers.length === 0 ? 'Add your first character' : null,
      href: campaignPath(campaignHandle, 'party'),
    },
    recentActivity: {
      items: recentItems,
      viewAllHref: campaignRecentChangesPath(campaignHandle),
      emptyMessage:
        'Your chronicle is quiet — lore updates and session notes will appear here.',
    },
    deepSystems,
  };
}

function campaignRecentChangesPath(handle: string): string {
  return campaignPath(handle, 'recent-changes');
}
