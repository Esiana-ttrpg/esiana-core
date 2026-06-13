import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { canManageChronology } from '../lib/acl.js';
import { CampaignMemberRoles, type CampaignMemberRole } from '../types/domain.js';
import {
  captureDualRegionPayloads,
  computeSinceLastVisitDiff,
  parseSnapshotPayload,
  resolveRegionScope,
} from '../lib/regionSnapshotService.js';
import { enqueueSnapshotCompression } from '../lib/snapshotCompressionQueue.js';
import {
  dismissVisitSuggestion,
  listVisitSuggestions,
  promoteVisitSuggestion,
} from '../lib/visitSuggestionService.js';
import {
  SNAPSHOT_PAYLOAD_VERSION,
  PROJECTION_SEMANTICS_VERSION,
  SnapshotPayloadTier,
  SnapshotKind,
  buildRegionDiff,
  stableJsonHash,
} from '../../../shared/narrativeSnapshots.js';
import { buildCampaignQuestStatusFacets } from '../lib/narrativeLifecycleService.js';
import { buildCalendarStates } from '../lib/timeTracking.js';
import type { FantasyCalendar } from '@prisma/client';

type SnapshotKindLabel = 'visit' | 'milestone' | 'manual';

function isElevated(role: CampaignMemberRole | null): boolean {
  return role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER;
}

function paramId(value: string | string[] | undefined): string | null {
  if (typeof value === 'string' && value.trim()) return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return null;
}

function scopeKeyFromSnapshot(row: {
  regionKey: string | null;
  anchorLocationPageId: string | null;
}): string {
  return row.regionKey ?? row.anchorLocationPageId ?? '';
}

export async function postLocationVisit(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const scope = req.campaign;
  if (!scope) {
    res.status(400).json({ error: 'Campaign scope required' });
    return;
  }
  const role = (scope.role as CampaignMemberRole | null) ?? null;
  if (!canManageChronology(role, scope.allowPlayerChronologyManagement)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const locationPageId = paramId(req.params.pageId);
  if (!locationPageId) {
    res.status(400).json({ error: 'pageId required' });
    return;
  }

  const regionScope = await resolveRegionScope(scope.campaignId, locationPageId);
  if (!regionScope) {
    res.status(404).json({ error: 'Location not found' });
    return;
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: scope.campaignId },
    select: { currentEpochMinute: true },
  });
  const capturedAtEpochMinute = campaign?.currentEpochMinute ?? 0n;

  const { dmPayload, partyPayload } = await captureDualRegionPayloads({
    campaignId: scope.campaignId,
    scope: regionScope,
    role,
    capturedAtEpochMinute,
  });

  const snapshot = await prisma.$transaction(async (tx) => {
    const snap = await tx.narrativeStateSnapshot.create({
      data: {
        campaignId: scope.campaignId,
        kind: SnapshotKind.PARTY_VISIT,
        snapshotType: 'region',
        payloadVersion: SNAPSHOT_PAYLOAD_VERSION,
        anchorLocationPageId: locationPageId,
        regionKey: regionScope.regionKey,
        capturedAtEpochMinute,
        projectionContextHash: dmPayload.meta.projectionContextHash,
        projectionSemanticsVersion: PROJECTION_SEMANTICS_VERSION,
        payloadTier: SnapshotPayloadTier.HOT,
        dmPayload: dmPayload as object,
        partyPayload: partyPayload as object,
        createdByUserId: req.user?.id ?? null,
      },
    });

    const visit = await tx.partyRegionVisit.create({
      data: {
        campaignId: scope.campaignId,
        locationPageId,
        snapshotId: snap.id,
        visitedAtEpochMinute: capturedAtEpochMinute,
        sessionTimelinePointId:
          typeof req.body?.sessionTimelinePointId === 'string'
            ? req.body.sessionTimelinePointId
            : null,
        createdByUserId: req.user?.id ?? null,
      },
    });

    return { snap, visit };
  });

  const sk = scopeKeyFromSnapshot(snapshot.snap);
  if (sk) {
    enqueueSnapshotCompression({
      campaignId: scope.campaignId,
      scopeKey: sk,
      retainHotSnapshotId: snapshot.snap.id,
    });
  }

  res.status(201).json({
    visit: {
      id: snapshot.visit.id,
      locationPageId,
      snapshotId: snapshot.snap.id,
      visitedAtEpochMinute: capturedAtEpochMinute.toString(),
      capturedAtEpochMinute: capturedAtEpochMinute.toString(),
    },
  });
}

export async function getLatestLocationVisit(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const scope = req.campaign;
  if (!scope) {
    res.status(400).json({ error: 'Campaign scope required' });
    return;
  }

  const locationPageId = paramId(req.params.pageId);
  if (!locationPageId) {
    res.status(400).json({ error: 'pageId required' });
    return;
  }
  const visit = await prisma.partyRegionVisit.findFirst({
    where: { campaignId: scope.campaignId, locationPageId },
    orderBy: { visitedAtEpochMinute: 'desc' },
    include: {
      snapshot: {
        select: {
          id: true,
          payloadTier: true,
          capturedAtEpochMinute: true,
          projectionSemanticsVersion: true,
        },
      },
    },
  });

  if (!visit) {
    res.status(404).json({ error: 'No canonical visit recorded' });
    return;
  }

  res.json({
    visit: {
      id: visit.id,
      locationPageId: visit.locationPageId,
      snapshotId: visit.snapshotId,
      visitedAtEpochMinute: visit.visitedAtEpochMinute.toString(),
      snapshot: {
        id: visit.snapshot.id,
        payloadTier: visit.snapshot.payloadTier,
        capturedAtEpochMinute: visit.snapshot.capturedAtEpochMinute.toString(),
        projectionSemanticsVersion: visit.snapshot.projectionSemanticsVersion,
      },
    },
  });
}

export async function getSinceLastVisit(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const scope = req.campaign;
  if (!scope) {
    res.status(400).json({ error: 'Campaign scope required' });
    return;
  }

  const role = (scope.role as CampaignMemberRole | null) ?? null;
  const perspectiveParam = req.query.perspective;
  const audience: 'party' | 'dm' =
    perspectiveParam === 'dm' && isElevated(role)
      ? 'dm'
      : 'party';

  const locationPageId = paramId(req.params.pageId);
  if (!locationPageId) {
    res.status(400).json({ error: 'pageId required' });
    return;
  }
  const visit = await prisma.partyRegionVisit.findFirst({
    where: { campaignId: scope.campaignId, locationPageId },
    orderBy: { visitedAtEpochMinute: 'desc' },
    include: { snapshot: true },
  });

  if (!visit) {
    res.status(404).json({ error: 'No canonical visit recorded' });
    return;
  }

  if (visit.snapshot.payloadTier !== SnapshotPayloadTier.HOT) {
    if (audience === 'dm') {
      res.status(409).json({
        error: 'Baseline snapshot archived',
        code: 'archived_baseline',
      });
      return;
    }
    res.json({
      audience: 'party',
      summaryLines: ['Things feel different since you were last here.'],
      structuredDiff: {},
      diegeticFallback: true,
    });
    return;
  }

  const baselineRaw =
    audience === 'dm' ? visit.snapshot.dmPayload : visit.snapshot.partyPayload;
  const baseline = parseSnapshotPayload(baselineRaw);
  if (!baseline || !baseline.facets) {
    res.status(500).json({ error: 'Invalid baseline snapshot' });
    return;
  }

  const regionScope = await resolveRegionScope(scope.campaignId, locationPageId);
  if (!regionScope) {
    res.status(404).json({ error: 'Location not found' });
    return;
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: scope.campaignId },
    select: { currentEpochMinute: true },
  });

  const diff = await computeSinceLastVisitDiff({
    campaignId: scope.campaignId,
    scope: regionScope,
    role,
    audience,
    baselinePayload: baseline,
    currentEpochMinute: campaign?.currentEpochMinute ?? 0n,
  });

  res.json(diff);
}

export async function getLocationVisitSuggestions(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const scope = req.campaign;
  if (!scope) {
    res.status(400).json({ error: 'Campaign scope required' });
    return;
  }
  const role = (scope.role as CampaignMemberRole | null) ?? null;
  if (!isElevated(role)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const locationPageId = paramId(req.params.pageId);
  if (!locationPageId) {
    res.status(400).json({ error: 'pageId required' });
    return;
  }
  const suggestions = await listVisitSuggestions(
    scope.campaignId,
    locationPageId,
  );
  res.json({
    suggestions: suggestions.map((s) => ({
      id: s.id,
      locationPageId: s.locationPageId,
      sessionTimelinePointId: s.sessionTimelinePointId,
      sourceLabel: s.sourceLabel,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}

export async function postPromoteVisitSuggestion(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const scope = req.campaign;
  if (!scope) {
    res.status(400).json({ error: 'Campaign scope required' });
    return;
  }
  const role = (scope.role as CampaignMemberRole | null) ?? null;
  if (!canManageChronology(role, scope.allowPlayerChronologyManagement)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const locationPageId = paramId(req.params.pageId);
  const suggestionId = paramId(req.params.suggestionId);
  if (!locationPageId || !suggestionId) {
    res.status(400).json({ error: 'pageId and suggestionId required' });
    return;
  }
  const result = await promoteVisitSuggestion(
    scope.campaignId,
    locationPageId,
    suggestionId,
    req.user?.id ?? null,
    role,
    scope.allowPlayerChronologyManagement,
  );

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(201).json(result.body);
}

export async function postDismissVisitSuggestion(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const scope = req.campaign;
  if (!scope) {
    res.status(400).json({ error: 'Campaign scope required' });
    return;
  }
  const role = (scope.role as CampaignMemberRole | null) ?? null;
  if (!isElevated(role)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const locationPageId = paramId(req.params.pageId);
  const suggestionId = paramId(req.params.suggestionId);
  if (!locationPageId || !suggestionId) {
    res.status(400).json({ error: 'pageId and suggestionId required' });
    return;
  }
  const ok = await dismissVisitSuggestion(
    scope.campaignId,
    locationPageId,
    suggestionId,
  );
  if (!ok) {
    res.status(404).json({ error: 'Suggestion not found' });
    return;
  }
  res.status(204).end();
}

export async function postMilestoneSnapshot(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const scope = req.campaign;
  if (!scope) {
    res.status(400).json({ error: 'Campaign scope required' });
    return;
  }
  const role = (scope.role as CampaignMemberRole | null) ?? null;
  if (!isElevated(role)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const label = typeof req.body?.label === 'string' ? req.body.label : null;
  const anchorLocationPageId =
    typeof req.body?.anchorLocationPageId === 'string'
      ? req.body.anchorLocationPageId
      : null;

  const campaign = await prisma.campaign.findUnique({
    where: { id: scope.campaignId },
    select: { currentEpochMinute: true },
  });
  const capturedAtEpochMinute = campaign?.currentEpochMinute ?? 0n;

  let dmPayload: object;
  let partyPayload: object;
  let regionKey: string | null = null;

  if (anchorLocationPageId) {
    const regionScope = await resolveRegionScope(
      scope.campaignId,
      anchorLocationPageId,
    );
    if (!regionScope) {
      res.status(404).json({ error: 'Location not found' });
      return;
    }
    regionKey = regionScope.regionKey;
    const payloads = await captureDualRegionPayloads({
      campaignId: scope.campaignId,
      scope: regionScope,
      role,
      capturedAtEpochMinute,
    });
    dmPayload = payloads.dmPayload;
    partyPayload = payloads.partyPayload;
  } else {
    const { dm: dmQuestStatuses, party: partyQuestStatuses } =
      await buildCampaignQuestStatusFacets(scope.campaignId);
    const meta = {
      snapshotVersion: SNAPSHOT_PAYLOAD_VERSION,
      projectionSemanticsVersion: PROJECTION_SEMANTICS_VERSION,
      projectionContextHash: 'milestone-campaign',
      collectorVersions: {},
      regionKey: null,
      anchorLocationPageId: '',
      capturedAtEpochMinute: capturedAtEpochMinute.toString(),
    };
    const dmPayloadInner = {
      meta,
      facets: { questStatuses: dmQuestStatuses },
      facetHashes: { campaignQuestHash: stableJsonHash(dmQuestStatuses) },
    };
    const partyPayloadInner = {
      meta,
      facets: { questStatuses: partyQuestStatuses },
      facetHashes: { campaignQuestHash: stableJsonHash(partyQuestStatuses) },
    };
    dmPayload = dmPayloadInner;
    partyPayload = partyPayloadInner;
  }

  const snap = await prisma.narrativeStateSnapshot.create({
    data: {
      campaignId: scope.campaignId,
      kind: SnapshotKind.MILESTONE,
      snapshotType: anchorLocationPageId ? 'region' : 'campaign',
      payloadVersion: SNAPSHOT_PAYLOAD_VERSION,
      label,
      anchorLocationPageId,
      regionKey,
      capturedAtEpochMinute,
      projectionContextHash:
        typeof dmPayload === 'object' &&
        dmPayload !== null &&
        'meta' in dmPayload &&
        typeof (dmPayload as { meta?: { projectionContextHash?: string } }).meta
          ?.projectionContextHash === 'string'
          ? (dmPayload as { meta: { projectionContextHash: string } }).meta
              .projectionContextHash
          : 'milestone',
      projectionSemanticsVersion: PROJECTION_SEMANTICS_VERSION,
      payloadTier: SnapshotPayloadTier.HOT,
      dmPayload,
      partyPayload,
      createdByUserId: req.user?.id ?? null,
    },
  });

  res.status(201).json({
    snapshot: {
      id: snap.id,
      kind: snap.kind,
      label: snap.label,
      anchorLocationPageId: snap.anchorLocationPageId,
      capturedAtEpochMinute: snap.capturedAtEpochMinute.toString(),
    },
  });
}

function snapshotKindLabel(kind: string): SnapshotKindLabel {
  if (kind === SnapshotKind.PARTY_VISIT) return 'visit';
  if (kind === SnapshotKind.MANUAL) return 'manual';
  return 'milestone';
}

function formatSnapshotDateLabel(
  epochMinute: bigint,
  masterCalendar: FantasyCalendar | null,
): string {
  if (!masterCalendar) {
    return `Minute ${epochMinute.toString()}`;
  }
  const [built] = buildCalendarStates(epochMinute, [masterCalendar]);
  const state = built?.state;
  if (!state) {
    return `Minute ${epochMinute.toString()}`;
  }
  return `${state.day} ${state.monthName}, Year ${state.year}`;
}

function buildSnapshotDisplayLabel(
  row: { kind: string; label: string | null },
  anchorLocationTitle: string | null,
): string {
  if (row.kind === SnapshotKind.PARTY_VISIT) {
    const place = anchorLocationTitle?.trim() || 'Unknown location';
    return `${place} visit`;
  }
  if (row.kind === SnapshotKind.MANUAL) {
    return row.label?.trim() || 'Manual capture';
  }
  return row.label?.trim() || 'Untitled milestone';
}

export async function listMilestoneSnapshots(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const scope = req.campaign;
  if (!scope) {
    res.status(400).json({ error: 'Campaign scope required' });
    return;
  }

  const comparableOnly = req.query.comparableOnly === 'true';

  const [rows, campaign] = await Promise.all([
    prisma.narrativeStateSnapshot.findMany({
      where: {
        campaignId: scope.campaignId,
        kind: {
          in: [
            SnapshotKind.MILESTONE,
            SnapshotKind.PARTY_VISIT,
            SnapshotKind.MANUAL,
          ],
        },
      },
      orderBy: { capturedAtEpochMinute: 'desc' },
      take: 50,
      select: {
        id: true,
        kind: true,
        label: true,
        anchorLocationPageId: true,
        capturedAtEpochMinute: true,
        payloadTier: true,
        snapshotType: true,
      },
    }),
    prisma.campaign.findUnique({
      where: { id: scope.campaignId },
      select: {
        fantasyCalendars: {
          orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }],
        },
      },
    }),
  ]);

  const masterCalendar =
    campaign?.fantasyCalendars.find((c) => c.isMasterTime) ??
    campaign?.fantasyCalendars[0] ??
    null;

  const locationIds = [
    ...new Set(
      rows
        .map((r) => r.anchorLocationPageId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const pages =
    locationIds.length > 0
      ? await prisma.wikiPage.findMany({
          where: {
            id: { in: locationIds },
            campaignId: scope.campaignId,
          },
          select: { id: true, title: true },
        })
      : [];
  const titleById = new Map(pages.map((p) => [p.id, p.title]));

  const snapshots = rows
    .map((r) => {
      const anchorLocationTitle = r.anchorLocationPageId
        ? (titleById.get(r.anchorLocationPageId) ?? null)
        : null;
      const comparable =
        r.payloadTier === SnapshotPayloadTier.HOT &&
        Boolean(r.anchorLocationPageId);

      return {
        id: r.id,
        kind: r.kind,
        label: r.label,
        capturedAtEpochMinute: r.capturedAtEpochMinute.toString(),
        displayLabel: buildSnapshotDisplayLabel(r, anchorLocationTitle),
        dateLabel: formatSnapshotDateLabel(r.capturedAtEpochMinute, masterCalendar),
        kindLabel: snapshotKindLabel(r.kind),
        anchorLocationPageId: r.anchorLocationPageId,
        anchorLocationTitle,
        payloadTier: r.payloadTier,
        snapshotType: r.snapshotType,
        comparable,
        compareTargetKind: 'snapshot' as const,
      };
    })
    .filter((row) => !comparableOnly || row.comparable);

  res.json({ snapshots });
}

export async function getMilestoneSnapshot(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const scope = req.campaign;
  if (!scope) {
    res.status(400).json({ error: 'Campaign scope required' });
    return;
  }

  const snapshotId = paramId(req.params.snapshotId);
  if (!snapshotId) {
    res.status(400).json({ error: 'snapshotId required' });
    return;
  }
  const row = await prisma.narrativeStateSnapshot.findFirst({
    where: {
      id: snapshotId,
      campaignId: scope.campaignId,
      kind: SnapshotKind.MILESTONE,
    },
  });
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const role = (scope.role as CampaignMemberRole | null) ?? null;
  const elevated = isElevated(role);

  res.json({
    snapshot: {
      id: row.id,
      label: row.label,
      payloadTier: row.payloadTier,
      dmPayload: elevated ? row.dmPayload : undefined,
      partyPayload: row.partyPayload,
    },
  });
}

export async function compareNarrativeSnapshots(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const scope = req.campaign;
  if (!scope) {
    res.status(400).json({ error: 'Campaign scope required' });
    return;
  }

  const fromId = typeof req.query.from === 'string' ? req.query.from : null;
  const toId = typeof req.query.to === 'string' ? req.query.to : null;
  if (!fromId || !toId) {
    res.status(400).json({ error: 'from and to query params required' });
    return;
  }

  const role = (scope.role as CampaignMemberRole | null) ?? null;
  const perspectiveParam = req.query.perspective;
  const audience: 'party' | 'dm' =
    perspectiveParam === 'dm' && isElevated(role)
      ? 'dm'
      : 'party';

  const [fromRow, toRow] = await Promise.all([
    prisma.narrativeStateSnapshot.findFirst({
      where: { id: fromId, campaignId: scope.campaignId },
    }),
    prisma.narrativeStateSnapshot.findFirst({
      where: { id: toId, campaignId: scope.campaignId },
    }),
  ]);

  if (!fromRow || !toRow) {
    res.status(404).json({ error: 'Snapshot not found' });
    return;
  }

  if (
    fromRow.payloadTier !== SnapshotPayloadTier.HOT ||
    toRow.payloadTier !== SnapshotPayloadTier.HOT
  ) {
    if (audience === 'dm') {
      res.status(409).json({
        error: 'One or both snapshots are archived',
        code: 'archived_compare',
      });
      return;
    }
    res.json({
      audience: 'party',
      summaryLines: [],
      structuredDiff: {},
      diegeticFallback: true,
    });
    return;
  }

  const baseline = parseSnapshotPayload(
    audience === 'dm' ? fromRow.dmPayload : fromRow.partyPayload,
  );
  const live = parseSnapshotPayload(
    audience === 'dm' ? toRow.dmPayload : toRow.partyPayload,
  );
  if (!baseline?.facets || !live?.facets) {
    res.status(500).json({ error: 'Invalid snapshot payloads' });
    return;
  }

  const anchorId =
    toRow.anchorLocationPageId ?? fromRow.anchorLocationPageId;
  if (!anchorId) {
    res.status(400).json({ error: 'Snapshots lack region anchor' });
    return;
  }

  const pageIds = new Set<string>([anchorId]);
  for (const row of [...baseline.facets.npcPresence, ...live.facets.npcPresence]) {
    pageIds.add(row.pageId);
    if (row.locationPageId) pageIds.add(row.locationPageId);
  }

  const pages = await prisma.wikiPage.findMany({
    where: { id: { in: [...pageIds] }, campaignId: scope.campaignId },
    select: { id: true, title: true },
  });
  const titleById = new Map(pages.map((p) => [p.id, p.title]));

  const diff = buildRegionDiff({
    audience,
    baseline,
    live,
    titleById,
    locationLabelById: titleById,
  });

  res.json(diff);
}
