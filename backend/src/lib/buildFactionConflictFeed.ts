import { prisma } from './prisma.js';
import { campaignWikiHref } from './dashboardPaths.js';
import { wikiPageHrefSelect } from './wikiPageHrefSelect.js';
import { resolveCampaignChronologyNow } from './chronologyDefaults.js';
import {
  parseOrganizationMetadata,
  resolveOrgRelationsAt,
} from './organizationMetadata.js';
import { buildConvergenceOverlay } from './chronologyConvergenceService.js';
import { ChronologyDomainKind } from '../../../shared/chronologyTypes.js';
import type { ConvergenceTimelineEntry } from '../../../shared/chronologyConvergence.js';
import {
  normalizeFactionConflictConfig,
} from '../../../shared/dashboardFactionConflictCatalog.js';
import { CampaignMemberRoles } from '../types/domain.js';
import type { CampaignMemberRole } from '../types/domain.js';

export type FactionConflictRelatedEvent = {
  id: string;
  title: string;
  href: string | null;
  timestamp: string;
};

export type FactionConflictRow = {
  id: string;
  factionA: { pageId: string; title: string; href: string };
  factionB: { pageId: string; title: string; href: string };
  mutual: boolean;
  relatedEvents: FactionConflictRelatedEvent[];
};

export type FactionConflictFeedResult = {
  pairs: FactionConflictRow[];
};

const HOSTILE_STANCES = new Set(['HOSTILE', 'SECRET_HOSTILE']);
const WORLD_EVENT_DOMAINS = [
  ChronologyDomainKind.WORLD_EVENT,
  ChronologyDomainKind.WORLD_ADVANCE,
  ChronologyDomainKind.ORG_RELATION,
  ChronologyDomainKind.FACTION_CONTROL,
] as const;
const MAX_RELATED_PER_PAIR = 3;

function isDmRole(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
  );
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

function entryReferencesOrg(
  entry: ConvergenceTimelineEntry,
  orgIds: Set<string>,
): boolean {
  const payload = entry.domainPayload;
  if (payload.domain === ChronologyDomainKind.ORG_RELATION) {
    return (
      orgIds.has(payload.payload.orgPageId) ||
      orgIds.has(payload.payload.targetOrgId)
    );
  }
  if (payload.domain === ChronologyDomainKind.FACTION_CONTROL) {
    const orgId = payload.payload.orgPageId;
    return orgId != null && orgIds.has(orgId);
  }
  return false;
}

export async function buildFactionConflictFeed(input: {
  campaignId: string;
  campaignHandle: string;
  role: CampaignMemberRole | null;
  allowPlayerChronologyManagement?: boolean;
  config?: Record<string, unknown>;
}): Promise<FactionConflictFeedResult> {
  const { sortBy, limit } = normalizeFactionConflictConfig(input.config);
  const dm = isDmRole(input.role);

  const [dateParts, orgPages, overlay] = await Promise.all([
    resolveCampaignChronologyNow(input.campaignId),
    prisma.wikiPage.findMany({
      where: {
        campaignId: input.campaignId,
        deletedAt: null,
        workspace: 'ORGANIZATIONS',
      },
      select: {
        ...wikiPageHrefSelect,
        metadata: true,
      },
    }),
    buildConvergenceOverlay({
      campaignId: input.campaignId,
      campaignHandle: input.campaignHandle,
      role: input.role,
      allowPlayerChronologyManagement: input.allowPlayerChronologyManagement ?? false,
      window: { mode: 'YEAR_RANGE', from: '0', to: '9999' },
      domains: [...WORLD_EVENT_DOMAINS],
      sessionLinkedOnly: false,
      includeSuppressed: false,
    }),
  ]);

  const pageById = new Map(orgPages.map((page) => [page.id, page]));
  const hostileEdges: Array<{ fromId: string; toId: string; secret: boolean }> = [];

  for (const page of orgPages) {
    const org = parseOrganizationMetadata(page.metadata);
    const resolved = resolveOrgRelationsAt(org, dateParts);
    for (const { relation, event } of resolved) {
      if (!HOSTILE_STANCES.has(event.stance)) continue;
      if (event.stance === 'SECRET_HOSTILE' && !dm) continue;
      if (!pageById.has(relation.targetOrgId)) continue;
      hostileEdges.push({
        fromId: page.id,
        toId: relation.targetOrgId,
        secret: event.stance === 'SECRET_HOSTILE',
      });
    }
  }

  const pairMap = new Map<
    string,
    { a: string; b: string; mutual: boolean }
  >();

  for (const edge of hostileEdges) {
    const key = pairKey(edge.fromId, edge.toId);
    const existing = pairMap.get(key);
    const reverseKey = pairKey(edge.toId, edge.fromId);
    const hasReverse = hostileEdges.some(
      (e) => e.fromId === edge.toId && e.toId === edge.fromId,
    );
    if (!existing) {
      const [a, b] = edge.fromId < edge.toId ? [edge.fromId, edge.toId] : [edge.toId, edge.fromId];
      pairMap.set(key, { a, b, mutual: hasReverse });
    } else if (hasReverse) {
      existing.mutual = true;
    }
    void reverseKey;
  }

  const visibleEntries = overlay.entries.filter((e) => e.projection.visible);

  const pairs: FactionConflictRow[] = [];
  for (const { a, b, mutual } of pairMap.values()) {
    const pageA = pageById.get(a);
    const pageB = pageById.get(b);
    if (!pageA || !pageB) continue;

    const orgIds = new Set([a, b]);
    const relatedEvents: FactionConflictRelatedEvent[] = [];
    for (const entry of visibleEntries) {
      if (!entryReferencesOrg(entry, orgIds)) continue;
      relatedEvents.push({
        id: entry.entryId,
        title: entry.display.title,
        href: entry.links[0]?.path ?? null,
        timestamp: entry.display.dateLabel ?? entry.instant.epochMinute ?? '',
      });
      if (relatedEvents.length >= MAX_RELATED_PER_PAIR) break;
    }

    pairs.push({
      id: pairKey(a, b),
      factionA: {
        pageId: pageA.id,
        title: pageA.title,
        href: campaignWikiHref(input.campaignHandle, pageA),
      },
      factionB: {
        pageId: pageB.id,
        title: pageB.title,
        href: campaignWikiHref(input.campaignHandle, pageB),
      },
      mutual,
      relatedEvents,
    });
  }

  if (sortBy === 'mutual_first') {
    pairs.sort((left, right) => {
      if (left.mutual !== right.mutual) return left.mutual ? -1 : 1;
      return left.factionA.title.localeCompare(right.factionA.title);
    });
  } else {
    pairs.sort((left, right) =>
      left.factionA.title.localeCompare(right.factionA.title),
    );
  }

  return { pairs: pairs.slice(0, limit) };
}
