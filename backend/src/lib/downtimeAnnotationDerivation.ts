import type { ChronologyDateParts } from '../../../shared/chronologyTypes.js';
import { compareChronologyDateParts } from '../../../shared/chronologyTypes.js';
import type {
  DowntimeAnnotation,
  DowntimeLocationMention,
} from '../../../shared/downtimeAnnotations.js';
import {
  MAX_DOWNTIME_ANNOTATIONS_PER_PERIOD,
  MAX_DOWNTIME_LOCATION_MENTIONS_PER_PERIOD,
  mergeDowntimeAnnotations,
  mergeDowntimeLocationMentions,
} from '../../../shared/downtimeAnnotations.js';
import type { DowntimePeriodGapBounds } from '../../../shared/downtimePeriodProjection.js';
import {
  WORLD_ADVANCE_CATEGORY,
  parseWorldAdvanceBatchPayload,
  type WorldAdvanceEffect,
} from '../../../shared/worldAdvance.js';
import { DOWNTIME_ALTERATIONS_METADATA_KEY } from './appendLocationDowntimeAlteration.js';
import { parseCharacterLocationHistory } from './characterLocationHistory.js';
import { prisma } from './prisma.js';
import {
  buildEntityCategoryWhereClause,
  readEntityCategoryFromMetadata,
} from './wikiCategoryEntityIndex.js';

type WikiPageSnapshot = {
  id: string;
  title: string;
  templateType: string;
  metadata: unknown;
};

type GapDateBounds = {
  startDateParts: ChronologyDateParts | null;
  endDateParts: ChronologyDateParts | null;
};

function epochInGap(epochMinute: string, start: bigint, end: bigint): boolean {
  try {
    const value = BigInt(epochMinute);
    return value > start && value <= end;
  } catch {
    return false;
  }
}

function dateInGap(
  date: ChronologyDateParts,
  bounds: GapDateBounds,
): boolean {
  const { startDateParts, endDateParts } = bounds;
  if (startDateParts && compareChronologyDateParts(date, startDateParts) < 0) {
    return false;
  }
  if (endDateParts && compareChronologyDateParts(date, endDateParts) > 0) {
    return false;
  }
  return true;
}

function parseLocationAlterations(metadata: unknown): Array<{
  description: string | null;
  atEpochMinute: string;
}> {
  if (!metadata || typeof metadata !== 'object') return [];
  const raw = (metadata as Record<string, unknown>)[DOWNTIME_ALTERATIONS_METADATA_KEY];
  if (!Array.isArray(raw)) return [];
  const out: Array<{ description: string | null; atEpochMinute: string }> = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    if (typeof obj.atEpochMinute !== 'string') continue;
    out.push({
      description: typeof obj.description === 'string' ? obj.description : null,
      atEpochMinute: obj.atEpochMinute,
    });
  }
  return out;
}

function mobilityRoleFromKind(
  kind: string,
): DowntimeAnnotation['role'] {
  if (kind === 'displacement') return 'absent';
  if (kind === 'intent') return 'occupied';
  return 'present';
}

function noteFromMobilityEffect(
  effect: WorldAdvanceEffect,
  locationTitleById: Map<string, string>,
): string | null {
  if (effect.type === 'displacement') {
    const toTitle = effect.toLocationPageId
      ? locationTitleById.get(effect.toLocationPageId)
      : null;
    if (effect.note?.trim()) return effect.note.trim();
    if (toTitle) return `displaced toward ${toTitle}`;
    return 'displaced during downtime';
  }
  if (effect.type === 'set_current_location') {
    if (!effect.locationPageId) return 'location cleared';
    const title = locationTitleById.get(effect.locationPageId);
    return title ? `relocated to ${title}` : 'relocated';
  }
  if (effect.type === 'append_location_event') {
    const title = locationTitleById.get(effect.locationPageId);
    if (effect.note?.trim()) return effect.note.trim();
    if (title) return `present at ${title}`;
    return null;
  }
  return null;
}

async function loadWikiSnapshots(campaignId: string): Promise<WikiPageSnapshot[]> {
  const rows = await prisma.wikiPage.findMany({
    where: {
      campaignId,
      OR: [
        ...(buildEntityCategoryWhereClause('characters').OR ?? []),
        ...(buildEntityCategoryWhereClause('locations').OR ?? []),
        ...(buildEntityCategoryWhereClause('organizations').OR ?? []),
      ],
    },
    select: {
      id: true,
      title: true,
      templateType: true,
      metadata: true,
    },
  });
  return rows;
}

async function loadWorldAdvanceMobilityInGap(
  campaignId: string,
  start: bigint,
  end: bigint,
): Promise<Array<{ effect: WorldAdvanceEffect; epochMinute: string }>> {
  const category = await prisma.calendarEventCategory.findFirst({
    where: { campaignId, name: WORLD_ADVANCE_CATEGORY },
    select: { id: true },
  });
  if (!category) return [];

  const events = await prisma.calendarEvent.findMany({
    where: {
      categoryId: category.id,
      targetEpochMinute: { gt: start, lte: end },
    },
    select: {
      description: true,
      targetEpochMinute: true,
    },
    take: 100,
    orderBy: { targetEpochMinute: 'desc' },
  });

  const out: Array<{ effect: WorldAdvanceEffect; epochMinute: string }> = [];
  for (const ev of events) {
    const epochMinute = ev.targetEpochMinute?.toString();
    if (!epochMinute) continue;
    let payload = null;
    try {
      payload = parseWorldAdvanceBatchPayload(JSON.parse(ev.description ?? '{}'));
    } catch {
      payload = null;
    }
    if (!payload) continue;
    for (const effect of payload.effects) {
      if (
        effect.type === 'append_location_event' ||
        effect.type === 'set_current_location' ||
        effect.type === 'displacement'
      ) {
        out.push({ effect, epochMinute });
      }
    }
  }
  return out;
}

export function deriveAnnotationsForGap(input: {
  gap: DowntimePeriodGapBounds;
  pages: WikiPageSnapshot[];
  dateBounds: GapDateBounds;
  mobilityEffects: Array<{ effect: WorldAdvanceEffect; epochMinute: string }>;
}): {
  annotations: DowntimeAnnotation[];
  locationMentions: DowntimeLocationMention[];
} {
  const start = BigInt(input.gap.startEpochMinute);
  const end = BigInt(input.gap.endEpochMinute);
  const locationTitleById = new Map(
    input.pages
      .filter((p) => readEntityCategoryFromMetadata(p.metadata) === 'locations')
      .map((p) => [p.id, p.title]),
  );
  const characterTitleById = new Map(
    input.pages
      .filter((p) => readEntityCategoryFromMetadata(p.metadata) === 'characters')
      .map((p) => [p.id, p.title]),
  );

  const derivedAnnotations: DowntimeAnnotation[] = [];
  const derivedMentions: DowntimeLocationMention[] = [];

  for (const page of input.pages) {
    if (readEntityCategoryFromMetadata(page.metadata) === 'characters') {
      const { locationHistory } = parseCharacterLocationHistory(page.metadata);
      for (const event of locationHistory) {
        if (!dateInGap(event.effectiveDate, input.dateBounds)) continue;
        const locationTitle = locationTitleById.get(event.locationPageId);
        const note =
          event.note?.trim() ||
          (locationTitle
            ? `present at ${locationTitle}`
            : 'present elsewhere during downtime');
        derivedAnnotations.push({
          entityPageId: page.id,
          entityKind: 'character',
          role: mobilityRoleFromKind(event.kind),
          note,
          source: 'derived',
        });
      }
    }

    if (readEntityCategoryFromMetadata(page.metadata) === 'locations') {
      for (const alteration of parseLocationAlterations(page.metadata)) {
        if (!epochInGap(alteration.atEpochMinute, start, end)) continue;
        const note =
          alteration.description?.trim() ||
          `${page.title} changed during downtime`;
        derivedMentions.push({
          locationPageId: page.id,
          note,
          source: 'derived',
        });
      }
    }
  }

  for (const { effect } of input.mobilityEffects) {
    if (effect.type === 'append_location_event' || effect.type === 'set_current_location' || effect.type === 'displacement') {
      const characterPageId = effect.characterPageId;
      const note = noteFromMobilityEffect(effect, locationTitleById);
      if (!note) continue;
      derivedAnnotations.push({
        entityPageId: characterPageId,
        entityKind: 'character',
        role: mobilityRoleFromKind(
          effect.type === 'displacement'
            ? 'displacement'
            : effect.type === 'append_location_event'
              ? effect.kind
              : 'residency',
        ),
        note,
        source: 'derived',
      });
      if (!characterTitleById.has(characterPageId)) {
        characterTitleById.set(characterPageId, 'Unknown character');
      }
    }
  }

  return {
    annotations: derivedAnnotations.slice(0, MAX_DOWNTIME_ANNOTATIONS_PER_PERIOD),
    locationMentions: derivedMentions.slice(0, MAX_DOWNTIME_LOCATION_MENTIONS_PER_PERIOD),
  };
}

export async function buildMergedGapAnnotations(input: {
  campaignId: string;
  gap: DowntimePeriodGapBounds;
  startDateParts: ChronologyDateParts | null;
  endDateParts: ChronologyDateParts | null;
  overlay?: {
    promotedLabel?: string | null;
    annotations?: DowntimeAnnotation[];
    locationMentions?: DowntimeLocationMention[];
  } | null;
}): Promise<{
  promotedLabel: string | null;
  annotations: DowntimeAnnotation[];
  locationMentions: DowntimeLocationMention[];
}> {
  const start = BigInt(input.gap.startEpochMinute);
  const end = BigInt(input.gap.endEpochMinute);

  const [pages, mobilityEffects] = await Promise.all([
    loadWikiSnapshots(input.campaignId),
    loadWorldAdvanceMobilityInGap(input.campaignId, start, end),
  ]);

  const derived = deriveAnnotationsForGap({
    gap: input.gap,
    pages,
    dateBounds: {
      startDateParts: input.startDateParts,
      endDateParts: input.endDateParts,
    },
    mobilityEffects,
  });

  const authoredAnnotations = input.overlay?.annotations ?? [];
  const authoredMentions = input.overlay?.locationMentions ?? [];

  const titleById = new Map(pages.map((p) => [p.id, p.title]));

  const enrichAnnotation = (row: DowntimeAnnotation): DowntimeAnnotation => ({
    ...row,
    entityTitle: titleById.get(row.entityPageId) ?? row.entityTitle ?? null,
  });

  const enrichMention = (row: DowntimeLocationMention): DowntimeLocationMention => {
    if (!row.locationPageId) return row;
    const title = titleById.get(row.locationPageId);
    if (!title || row.note.includes(title)) return row;
    return row;
  };

  return {
    promotedLabel: input.overlay?.promotedLabel?.trim() || null,
    annotations: mergeDowntimeAnnotations(authoredAnnotations, derived.annotations).map(
      enrichAnnotation,
    ),
    locationMentions: mergeDowntimeLocationMentions(
      authoredMentions,
      derived.locationMentions,
    ).map(enrichMention),
  };
}
