import { prisma } from './prisma.js';
import { parseSessionNoteMetadata } from './sessionNoteMetadata.js';
import type { CampaignMemberRole } from '../types/domain.js';
import {
  captureDualRegionPayloads,
  resolveRegionScope,
} from './regionSnapshotService.js';
import {
  SNAPSHOT_PAYLOAD_VERSION,
  PROJECTION_SEMANTICS_VERSION,
  SnapshotPayloadTier,
  SnapshotKind,
} from '../../../shared/narrativeSnapshots.js';
import { enqueueSnapshotCompression } from './snapshotCompressionQueue.js';

export async function syncVisitSuggestionsForLocation(
  campaignId: string,
  locationPageId: string,
): Promise<void> {
  const timelinePoints = await prisma.campaignSessionTimeline.findMany({
    where: { campaignId },
    select: {
      id: true,
      sequenceOrder: true,
      wikiPage: { select: { title: true, metadata: true } },
      schedule: { select: { locationPageId: true } },
    },
    orderBy: { sequenceOrder: 'desc' },
    take: 50,
  });

  for (const point of timelinePoints) {
    const meta = parseSessionNoteMetadata(point.wikiPage.metadata);
    const locId = point.schedule?.locationPageId ?? meta.locationPageId ?? null;
    if (locId !== locationPageId) continue;

    const existing = await prisma.partyVisitSuggestion.findFirst({
      where: {
        campaignId,
        locationPageId,
        sessionTimelinePointId: point.id,
        dismissedAt: null,
        promotedSnapshotId: null,
      },
    });
    if (existing) continue;

    await prisma.partyVisitSuggestion.create({
      data: {
        campaignId,
        locationPageId,
        sessionTimelinePointId: point.id,
        sourceLabel: point.wikiPage.title,
      },
    });
  }
}

export async function listVisitSuggestions(
  campaignId: string,
  locationPageId: string,
) {
  await syncVisitSuggestionsForLocation(campaignId, locationPageId);
  return prisma.partyVisitSuggestion.findMany({
    where: {
      campaignId,
      locationPageId,
      dismissedAt: null,
      promotedSnapshotId: null,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

export async function dismissVisitSuggestion(
  campaignId: string,
  locationPageId: string,
  suggestionId: string,
): Promise<boolean> {
  const row = await prisma.partyVisitSuggestion.findFirst({
    where: {
      id: suggestionId,
      campaignId,
      locationPageId,
      dismissedAt: null,
    },
  });
  if (!row) return false;
  await prisma.partyVisitSuggestion.update({
    where: { id: suggestionId },
    data: { dismissedAt: new Date() },
  });
  return true;
}

export async function promoteVisitSuggestion(
  campaignId: string,
  locationPageId: string,
  suggestionId: string,
  userId: string | null,
  role: CampaignMemberRole | null,
  _allowPlayerChronologyManagement: boolean,
): Promise<
  | { ok: true; body: { visit: Record<string, string> } }
  | { ok: false; status: number; error: string }
> {
  const suggestion = await prisma.partyVisitSuggestion.findFirst({
    where: {
      id: suggestionId,
      campaignId,
      locationPageId,
      dismissedAt: null,
      promotedSnapshotId: null,
    },
  });
  if (!suggestion) {
    return { ok: false, status: 404, error: 'Suggestion not found' };
  }

  const regionScope = await resolveRegionScope(campaignId, locationPageId);
  if (!regionScope) {
    return { ok: false, status: 404, error: 'Location not found' };
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { currentEpochMinute: true },
  });
  const capturedAtEpochMinute = campaign?.currentEpochMinute ?? 0n;

  const { dmPayload, partyPayload } = await captureDualRegionPayloads({
    campaignId,
    scope: regionScope,
    role,
    capturedAtEpochMinute,
  });

  const result = await prisma.$transaction(async (tx) => {
    const snap = await tx.narrativeStateSnapshot.create({
      data: {
        campaignId,
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
        createdByUserId: userId,
      },
    });

    const visit = await tx.partyRegionVisit.create({
      data: {
        campaignId,
        locationPageId,
        snapshotId: snap.id,
        visitedAtEpochMinute: capturedAtEpochMinute,
        sessionTimelinePointId: suggestion.sessionTimelinePointId,
        createdByUserId: userId,
      },
    });

    await tx.partyVisitSuggestion.update({
      where: { id: suggestionId },
      data: { promotedSnapshotId: snap.id },
    });

    return { snap, visit };
  });

  const sk = regionScope.regionKey ?? locationPageId;
  enqueueSnapshotCompression({
    campaignId,
    scopeKey: sk,
    retainHotSnapshotId: result.snap.id,
  });

  return {
    ok: true,
    body: {
      visit: {
        id: result.visit.id,
        locationPageId,
        snapshotId: result.snap.id,
        visitedAtEpochMinute: capturedAtEpochMinute.toString(),
      },
    },
  };
}
