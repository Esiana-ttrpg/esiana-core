import type { Prisma } from '@prisma/client';

export const DOWNTIME_ALTERATIONS_METADATA_KEY = 'downtimeAlterations';

export type LocationAlterationSourceKind = 'project' | 'event';

export type LocationDowntimeAlterationEntry = {
  id: string;
  sourceKind: LocationAlterationSourceKind;
  /** Project id when sourceKind is project. */
  sourceProjectId?: string;
  /** Calendar event id when sourceKind is event. */
  sourceEventId?: string;
  outcomeId: string;
  description: string | null;
  atEpochMinute: string;
  appliedAt: string;
};

function parseAlterations(raw: unknown): LocationDowntimeAlterationEntry[] {
  if (!Array.isArray(raw)) return [];
  const result: LocationDowntimeAlterationEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== 'string' || typeof record.outcomeId !== 'string') {
      continue;
    }
    if (typeof record.atEpochMinute !== 'string') continue;

    const sourceKindRaw = record.sourceKind;
    const sourceProjectId =
      typeof record.sourceProjectId === 'string' ? record.sourceProjectId : undefined;
    const sourceEventId =
      typeof record.sourceEventId === 'string' ? record.sourceEventId : undefined;

    let sourceKind: LocationAlterationSourceKind;
    if (sourceKindRaw === 'event') {
      sourceKind = 'event';
    } else if (sourceKindRaw === 'project') {
      sourceKind = 'project';
    } else if (sourceEventId) {
      sourceKind = 'event';
    } else if (sourceProjectId) {
      sourceKind = 'project';
    } else {
      continue;
    }

    if (sourceKind === 'project' && !sourceProjectId) continue;
    if (sourceKind === 'event' && !sourceEventId) continue;

    result.push({
      id: record.id,
      sourceKind,
      sourceProjectId: sourceKind === 'project' ? sourceProjectId : undefined,
      sourceEventId: sourceKind === 'event' ? sourceEventId : undefined,
      outcomeId: record.outcomeId,
      description:
        typeof record.description === 'string' ? record.description : null,
      atEpochMinute: record.atEpochMinute,
      appliedAt:
        typeof record.appliedAt === 'string'
          ? record.appliedAt
          : new Date().toISOString(),
    });
  }
  return result;
}

function alterationDuplicate(
  existing: LocationDowntimeAlterationEntry[],
  entry: LocationDowntimeAlterationEntry,
): boolean {
  return existing.some((row) => {
    if (row.outcomeId !== entry.outcomeId) return false;
    if (entry.sourceKind === 'event') {
      return row.sourceKind === 'event' && row.sourceEventId === entry.sourceEventId;
    }
    return (
      row.sourceKind === 'project' && row.sourceProjectId === entry.sourceProjectId
    );
  });
}

/** Append-only narrative alteration on a location wiki page — no geometry or field mutation. */
export async function appendLocationDowntimeAlteration(
  tx: Prisma.TransactionClient,
  input: {
    campaignId: string;
    locationPageId: string;
    entry: LocationDowntimeAlterationEntry;
  },
): Promise<boolean> {
  const page = await tx.wikiPage.findFirst({
    where: { id: input.locationPageId, campaignId: input.campaignId },
    select: { id: true, metadata: true },
  });
  if (!page) return false;

  const metadata =
    page.metadata && typeof page.metadata === 'object' && !Array.isArray(page.metadata)
      ? { ...(page.metadata as Record<string, unknown>) }
      : {};

  const existing = parseAlterations(metadata[DOWNTIME_ALTERATIONS_METADATA_KEY]);
  if (alterationDuplicate(existing, input.entry)) return true;

  metadata[DOWNTIME_ALTERATIONS_METADATA_KEY] = [...existing, input.entry];

  await tx.wikiPage.update({
    where: { id: page.id },
    data: { metadata: metadata as never },
  });

  return true;
}
