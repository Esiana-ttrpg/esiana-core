import { prisma } from './prisma.js';
import {
  compressPayloadToCold,
  SnapshotPayloadTier,
  SnapshotKind,
  type RegionSnapshotPayloadV1,
} from '../../../shared/narrativeSnapshots.js';

export type SnapshotCompressionJob = {
  campaignId: string;
  scopeKey: string;
  retainHotSnapshotId: string;
  hotWindow: number;
};

const pendingByScope = new Map<string, SnapshotCompressionJob>();

function scopeJobKey(campaignId: string, scopeKey: string): string {
  return `${campaignId}:${scopeKey}`;
}

function hotWindowFromEnv(): number {
  const raw = process.env.SNAPSHOT_HOT_VISITS_PER_REGION;
  if (!raw) return 1;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function enqueueSnapshotCompression(job: Omit<SnapshotCompressionJob, 'hotWindow'>): void {
  const full: SnapshotCompressionJob = {
    ...job,
    hotWindow: hotWindowFromEnv(),
  };
  pendingByScope.set(scopeJobKey(job.campaignId, job.scopeKey), full);
  void processSnapshotCompressionJob(full).catch((error) => {
    console.error('[snapshot-compression] job failed', { job: full, error });
    scheduleRetry(full);
  });
}

function scheduleRetry(job: SnapshotCompressionJob): void {
  const delayMs = Math.min(60_000, 2000 * (2 ** Math.min(job.hotWindow, 5)));
  setTimeout(() => {
    void processSnapshotCompressionJob(job).catch((error) => {
      console.error('[snapshot-compression] retry failed', { job, error });
    });
  }, delayMs);
}

function parsePayload(json: unknown): RegionSnapshotPayloadV1 | null {
  if (!json || typeof json !== 'object') return null;
  const raw = json as RegionSnapshotPayloadV1;
  if (!raw.meta || !raw.facetHashes) return null;
  return raw;
}

export async function processSnapshotCompressionJob(
  job: SnapshotCompressionJob,
): Promise<void> {
  const key = scopeJobKey(job.campaignId, job.scopeKey);
  const latest = pendingByScope.get(key);
  if (latest && latest.retainHotSnapshotId !== job.retainHotSnapshotId) {
    job = latest;
  }
  pendingByScope.delete(key);

  const retain = await prisma.narrativeStateSnapshot.findFirst({
    where: { id: job.retainHotSnapshotId, campaignId: job.campaignId },
    select: {
      id: true,
      regionKey: true,
      anchorLocationPageId: true,
    },
  });
  if (!retain) return;

  const scopeFilter =
    retain.regionKey != null
      ? { regionKey: retain.regionKey }
      : { anchorLocationPageId: retain.anchorLocationPageId };

  const hotSnapshots = await prisma.narrativeStateSnapshot.findMany({
    where: {
      campaignId: job.campaignId,
      kind: SnapshotKind.PARTY_VISIT,
      payloadTier: SnapshotPayloadTier.HOT,
      ...scopeFilter,
    },
    orderBy: { capturedAtEpochMinute: 'desc' },
    select: {
      id: true,
      dmPayload: true,
      partyPayload: true,
      compressionAttempts: true,
    },
  });

  const toRetain = new Set(
    hotSnapshots.slice(0, job.hotWindow).map((s) => s.id),
  );
  toRetain.add(job.retainHotSnapshotId);

  for (const snap of hotSnapshots) {
    if (toRetain.has(snap.id)) continue;
    if (snap.id === job.retainHotSnapshotId) continue;

    const dm = parsePayload(snap.dmPayload);
    const party = parsePayload(snap.partyPayload);
    if (!dm || !party) continue;

    const coldDm = compressPayloadToCold(dm);
    const coldParty = compressPayloadToCold(party);

    await prisma.narrativeStateSnapshot.update({
      where: { id: snap.id },
      data: {
        payloadTier: SnapshotPayloadTier.COLD,
        dmPayload: coldDm as object,
        partyPayload: coldParty as object,
        compressionAttempts: snap.compressionAttempts + 1,
      },
    });
  }
}
