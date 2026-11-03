import type { MetricValue } from '../metricValue.js';
import { readMetricAmount } from '../metricValue.js';
import type {
  WrappedAttributionScope,
  WrappedCalculationV1,
  WrappedEditionTier,
  WrappedSlideId,
} from '../wrappedTypes.js';

export type WrappedSlideDefinition = {
  id: WrappedSlideId;
  scope: WrappedAttributionScope;
  visualization: string;
  narrativeKey: string;
  sharePolicy: 'owner_only' | 'share_safe_allowlist' | 'never_export';
  /** Lower sorts earlier among eligible pool slides (after mandatory bookends). */
  priority: number;
  mandatory: boolean;
  /**
   * Returns true when the slide is meaningful for this calculation.
   * Must not invent achievements from unavailable metrics.
   */
  isEligible: (calc: WrappedCalculationV1) => boolean;
};

function hasPositive(value: MetricValue | undefined): boolean {
  const amount = readMetricAmount(value);
  return amount != null && amount > 0;
}

function coverageStatus(
  calc: WrappedCalculationV1,
  family: WrappedCalculationV1['coverage'][number]['family'],
): string {
  return calc.coverage.find((c) => c.family === family)?.status ?? 'unavailable';
}

function coverageReady(
  calc: WrappedCalculationV1,
  family: WrappedCalculationV1['coverage'][number]['family'],
): boolean {
  const status = coverageStatus(calc, family);
  return status === 'measured' || status === 'partial' || status === 'reconstructed';
}

export const WRAPPED_SLIDE_REGISTRY: readonly WrappedSlideDefinition[] = [
  {
    id: 'year-intro',
    scope: 'personal',
    visualization: 'year-intro',
    narrativeKey: 'profile.wrapped.slides.yearIntro',
    sharePolicy: 'share_safe_allowlist',
    priority: 0,
    mandatory: true,
    isEligible: () => true,
  },
  {
    id: 'worlds-explored',
    scope: 'personal',
    visualization: 'worlds-explored',
    narrativeKey: 'profile.wrapped.slides.worldsExplored',
    sharePolicy: 'share_safe_allowlist',
    priority: 10,
    mandatory: false,
    isEligible: (calc) =>
      coverageReady(calc, 'campaigns') &&
      (Object.keys(calc.metrics.byCampaign).length > 0 ||
        hasPositive(calc.metrics.participation.campaignsParticipated)),
  },
  {
    id: 'adventure-log',
    scope: 'personal',
    visualization: 'adventure-log',
    narrativeKey: 'profile.wrapped.slides.adventureLog',
    sharePolicy: 'share_safe_allowlist',
    priority: 20,
    mandatory: false,
    isEligible: (calc) => {
      if (!coverageReady(calc, 'participation')) return false;
      return (
        hasPositive(calc.metrics.participation.sessionsAttended) ||
        hasPositive(calc.metrics.participation.sessionsHosted)
      );
    },
  },
  {
    id: 'creative-legacy',
    scope: 'personal',
    visualization: 'creative-legacy',
    narrativeKey: 'profile.wrapped.slides.creativeLegacy',
    sharePolicy: 'share_safe_allowlist',
    priority: 30,
    mandatory: false,
    isEligible: (calc) => {
      if (!coverageReady(calc, 'writing') && !coverageReady(calc, 'worldbuilding')) {
        return false;
      }
      return (
        hasPositive(calc.metrics.personal['period.wordsAdded']) ||
        hasPositive(calc.metrics.personal['period.pagesCreated']) ||
        hasPositive(calc.metrics.personal['period.pagesEdited'])
      );
    },
  },
  {
    id: 'top-campaign',
    scope: 'campaign',
    visualization: 'top-campaign',
    narrativeKey: 'profile.wrapped.slides.topCampaign',
    sharePolicy: 'owner_only',
    priority: 40,
    mandatory: false,
    isEligible: (calc) => calc.topCampaign != null,
  },
  {
    id: 'writing-rhythm',
    scope: 'personal',
    visualization: 'writing-rhythm',
    narrativeKey: 'profile.wrapped.slides.writingRhythm',
    sharePolicy: 'share_safe_allowlist',
    priority: 50,
    mandatory: false,
    isEligible: (calc) =>
      coverageReady(calc, 'writing') &&
      calc.monthlyActivity.some((m) => m.activeDays > 0 || m.contributions > 0),
  },
  {
    id: 'world-you-helped-build',
    scope: 'personal',
    visualization: 'world-you-helped-build',
    narrativeKey: 'profile.wrapped.slides.worldYouHelpedBuild',
    sharePolicy: 'share_safe_allowlist',
    priority: 60,
    mandatory: false,
    isEligible: (calc) => {
      if (
        !coverageReady(calc, 'worldbuilding') &&
        !coverageReady(calc, 'cartography') &&
        !coverageReady(calc, 'chronology')
      ) {
        return false;
      }
      return (
        hasPositive(calc.metrics.personal['period.charactersCreated']) ||
        hasPositive(calc.metrics.personal['period.locationsCreated']) ||
        hasPositive(calc.metrics.personal['period.connectionsCreated']) ||
        hasPositive(calc.metrics.personal['period.pagesCreated'])
      );
    },
  },
  {
    id: 'biggest-month',
    scope: 'personal',
    visualization: 'biggest-month',
    narrativeKey: 'profile.wrapped.slides.biggestMonth',
    sharePolicy: 'share_safe_allowlist',
    priority: 70,
    mandatory: false,
    isEligible: (calc) =>
      calc.biggestMonth != null &&
      (calc.biggestMonth.activeDays > 0 || calc.biggestMonth.contributions > 0),
  },
  {
    id: 'fellow-adventurers',
    scope: 'shared',
    visualization: 'fellow-adventurers',
    narrativeKey: 'profile.wrapped.slides.fellowAdventurers',
    sharePolicy: 'never_export',
    priority: 80,
    mandatory: false,
    isEligible: (calc) => {
      if (!coverageReady(calc, 'sharedAttendance')) return false;
      return hasPositive(calc.metrics.shared.fellowAdventurerCount);
    },
  },
  {
    id: 'year-compared',
    scope: 'comparative',
    visualization: 'year-compared',
    narrativeKey: 'profile.wrapped.slides.yearCompared',
    sharePolicy: 'share_safe_allowlist',
    priority: 90,
    mandatory: false,
    isEligible: (calc) =>
      calc.metrics.comparative.previousEligible &&
      coverageReady(calc, 'comparative') &&
      Object.values(calc.metrics.comparative.deltas).some((v) => {
        const amount = readMetricAmount(v);
        return amount != null && amount !== 0;
      }),
  },
  {
    id: 'signature-achievement',
    scope: 'personal',
    visualization: 'signature-achievement',
    narrativeKey: 'profile.wrapped.slides.signatureAchievement',
    sharePolicy: 'share_safe_allowlist',
    priority: 100,
    mandatory: false,
    isEligible: (calc) =>
      calc.archetypes?.dominantId != null ||
      hasPositive(calc.metrics.personal['period.wordsAdded']) ||
      Object.keys(calc.metrics.byCampaign).length > 0,
  },
  {
    id: 'year-summary',
    scope: 'personal',
    visualization: 'year-summary',
    narrativeKey: 'profile.wrapped.slides.yearSummary',
    sharePolicy: 'share_safe_allowlist',
    priority: 1000,
    mandatory: true,
    isEligible: () => true,
  },
];

export function getSlideDefinition(id: WrappedSlideId): WrappedSlideDefinition | undefined {
  return WRAPPED_SLIDE_REGISTRY.find((s) => s.id === id);
}

/**
 * Select ordered slide IDs. Mandatory intro/summary always bookend.
 * Cap optional slides so total stays within 15.
 */
export function selectWrappedSlideIds(calc: WrappedCalculationV1): WrappedSlideId[] {
  const intro = WRAPPED_SLIDE_REGISTRY.find((s) => s.id === 'year-intro')!;
  const summary = WRAPPED_SLIDE_REGISTRY.find((s) => s.id === 'year-summary')!;
  const pool = WRAPPED_SLIDE_REGISTRY.filter(
    (s) => !s.mandatory && s.isEligible(calc),
  ).sort((a, b) => a.priority - b.priority);

  const maxOptional = 13;
  const optional = pool.slice(0, maxOptional).map((s) => s.id);
  return [intro.id, ...optional, summary.id];
}

export function resolveEditionTier(slideCount: number): WrappedEditionTier {
  if (slideCount >= 8) return 'full';
  if (slideCount >= 3) return 'short';
  return 'unavailable';
}

/**
 * Seasonal invite discovery states — never gate invite `active` solely on
 * eligibility; map the assembled tier so CTAs never promise a 404 edition.
 */
export function resolveWrappedInviteAvailability(
  editionTier: WrappedEditionTier,
): 'ready' | 'limited' | 'unavailable' {
  if (editionTier === 'full') return 'ready';
  if (editionTier === 'short') return 'limited';
  return 'unavailable';
}

export function buildSlideManifest(
  slideIds: WrappedSlideId[],
): Array<{
  id: WrappedSlideId;
  scope: WrappedAttributionScope;
  visualization: string;
  narrativeKey: string;
  sharePolicy: WrappedSlideDefinition['sharePolicy'];
}> {
  return slideIds
    .map((id) => getSlideDefinition(id))
    .filter((d): d is WrappedSlideDefinition => d != null)
    .map((d) => ({
      id: d.id,
      scope: d.scope,
      visualization: d.visualization,
      narrativeKey: d.narrativeKey,
      sharePolicy: d.sharePolicy,
    }));
}
