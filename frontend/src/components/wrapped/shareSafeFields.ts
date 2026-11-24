import { readMetricAmount } from '@shared/metricValue';
import type {
  WrappedFinalCardPreset,
  WrappedYearResponse,
} from '@shared/wrappedTypes';
import { WRAPPED_SHARE_SAFE_FIELD_IDS } from '@shared/wrappedTypes';

export type ShareSafeFinalCardModel = {
  year: number;
  preset: WrappedFinalCardPreset;
  coverageDisclosure: WrappedYearResponse['calculation']['coverageDisclosure'];
  fields: Array<{ id: string; labelKey: string; value: number }>;
  dominantArchetype: string | null;
};

const PRESET_FIELDS: Record<
  WrappedFinalCardPreset,
  Array<{ id: (typeof WRAPPED_SHARE_SAFE_FIELD_IDS)[number]; labelKey: string }>
> = {
  adventurer: [
    { id: 'participation.campaignsParticipated', labelKey: 'profile.wrapped.slides.campaignsCount' },
    { id: 'participation.sessionsAttended', labelKey: 'profile.wrapped.slides.sessionsAttended' },
    { id: 'participation.sessionsHosted', labelKey: 'profile.wrapped.slides.sessionsHosted' },
  ],
  worldbuilder: [
    { id: 'personal.period.pagesCreated', labelKey: 'profile.wrapped.slides.pagesCreated' },
    { id: 'personal.period.pagesEdited', labelKey: 'profile.wrapped.slides.pagesEdited' },
    { id: 'participation.campaignsParticipated', labelKey: 'profile.wrapped.slides.campaignsCount' },
  ],
  storyteller: [
    { id: 'personal.period.wordsAdded', labelKey: 'profile.wrapped.slides.wordsWritten' },
    { id: 'personal.period.pagesCreated', labelKey: 'profile.wrapped.slides.pagesCreated' },
    { id: 'participation.sessionsAttended', labelKey: 'profile.wrapped.slides.sessionsAttended' },
  ],
};

function readShareSafeAmount(
  data: WrappedYearResponse,
  id: (typeof WRAPPED_SHARE_SAFE_FIELD_IDS)[number],
): number | null {
  switch (id) {
    case 'year':
      return data.year;
    case 'personal.period.wordsAdded':
      return readMetricAmount(data.calculation.metrics.personal['period.wordsAdded']);
    case 'personal.period.pagesCreated':
      return readMetricAmount(data.calculation.metrics.personal['period.pagesCreated']);
    case 'personal.period.pagesEdited':
      return readMetricAmount(data.calculation.metrics.personal['period.pagesEdited']);
    case 'participation.sessionsAttended':
      return readMetricAmount(data.calculation.metrics.participation.sessionsAttended);
    case 'participation.sessionsHosted':
      return readMetricAmount(data.calculation.metrics.participation.sessionsHosted);
    case 'participation.campaignsParticipated': {
      const fromMetric = readMetricAmount(
        data.calculation.metrics.participation.campaignsParticipated,
      );
      if (fromMetric != null) return fromMetric;
      return Object.keys(data.calculation.metrics.byCampaign).length || null;
    }
    case 'archetype.dominantId':
    case 'preset':
    case 'coverageDisclosure':
      return null;
    default:
      return null;
  }
}

/**
 * Build the allowlisted final-card model. Campaign-specific counts and artwork
 * never enter this surface.
 */
export function buildShareSafeFinalCard(
  data: WrappedYearResponse,
  preset: WrappedFinalCardPreset,
): ShareSafeFinalCardModel {
  const fields: ShareSafeFinalCardModel['fields'] = [];
  for (const entry of PRESET_FIELDS[preset]) {
    const value = readShareSafeAmount(data, entry.id);
    if (value == null || value < 0) continue;
    // Zero is allowed on the share card only when measured (not unavailable).
    fields.push({ id: entry.id, labelKey: entry.labelKey, value });
  }

  return {
    year: data.year,
    preset,
    coverageDisclosure: data.calculation.coverageDisclosure,
    fields,
    dominantArchetype: data.calculation.archetypes?.dominantId ?? null,
  };
}

export function assertNoCampaignIdsInShareModel(model: ShareSafeFinalCardModel): void {
  const serialized = JSON.stringify(model);
  if (serialized.includes('campaignId') || serialized.includes('coverImageUrl')) {
    throw new Error('Share-safe model leaked campaign presentation fields');
  }
}
