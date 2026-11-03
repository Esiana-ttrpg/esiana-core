import {
  PERSONAL_ARCHETYPE_IDS,
  PERSONAL_ARCHETYPE_RULESET_VERSION,
  type PersonalArchetypeId,
  type PersonalArchetypes,
  type CartographyDomainStats,
  type ChronologyDomainStats,
  type ParticipationDomainStats,
  type WorldbuildingDomainStats,
} from '../../../../../shared/statsTypes.js';
import { readMetricAmount, type MetricValue } from '../../../../../shared/metricValue.js';

/**
 * Pass 10 ruleset v1 — period activity only.
 *
 * Normalization model (documented):
 * 1. Each archetype accumulates a raw score from soft-weighted period signals
 *    (words, edits, session minutes, domain creates/edits, participation).
 *    Units are deliberately mixed; weights convert them into a tendency shape,
 *    not comparable absolute volumes (a map edit ≠ a word written).
 * 2. An axis is `unavailable` when every contributing MetricValue for that
 *    axis is missing or `unavailable`. Unavailable axes are excluded from the
 *    L1 denominator and keep `score: null` (never coerced to zero).
 * 3. Measured axes (including true zeros) are L1-normalized so their scores
 *    sum to 1 when any measured raw activity exists. All-zero measured windows
 *    yield measured scores of 0 without inventing equal shares.
 */
export type ArchetypeSignalInput = {
  wordsAdded: MetricValue | undefined;
  pagesEdited: MetricValue | undefined;
  sessionMinutes: number;
  worldbuilding: WorldbuildingDomainStats[];
  cartography: CartographyDomainStats[];
  chronology: ChronologyDomainStats[];
  participation: ParticipationDomainStats[];
};

function amount(value: MetricValue | undefined): number {
  return readMetricAmount(value) ?? 0;
}

function isTracked(value: MetricValue | undefined): boolean {
  return value != null && value.status !== 'unavailable';
}

function anyTracked(values: Array<MetricValue | undefined>): boolean {
  return values.some(isTracked);
}

function sumWorldbuilding(
  rows: WorldbuildingDomainStats[],
  field: 'periodCreated' | 'periodEdited',
  domains?: Set<string>,
): number {
  let total = 0;
  for (const row of rows) {
    if (domains && !domains.has(row.domain)) continue;
    total += amount(row[field]);
  }
  return total;
}

function worldbuildingTracked(
  rows: WorldbuildingDomainStats[],
  field: 'periodCreated' | 'periodEdited',
  domains?: Set<string>,
): boolean {
  return rows.some((row) => {
    if (domains && !domains.has(row.domain)) return false;
    return isTracked(row[field]);
  });
}

function sumCartography(
  rows: CartographyDomainStats[],
  field: 'periodCreated' | 'periodEdited',
): number {
  return rows.reduce((sum, row) => sum + amount(row[field]), 0);
}

function sumChronology(
  rows: ChronologyDomainStats[],
  field: 'periodCreated' | 'periodEdited',
): number {
  return rows.reduce((sum, row) => sum + amount(row[field]), 0);
}

function participationPeriod(
  rows: ParticipationDomainStats[],
  domain: ParticipationDomainStats['domain'],
): number {
  const row = rows.find((entry) => entry.domain === domain);
  return amount(row?.periodTotal);
}

function participationTracked(
  rows: ParticipationDomainStats[],
  domain: ParticipationDomainStats['domain'],
): boolean {
  const row = rows.find((entry) => entry.domain === domain);
  return isTracked(row?.periodTotal);
}

function chronologyMinutesAdvanced(rows: ChronologyDomainStats[]): number {
  const advances = rows.find((row) => row.domain === 'timeAdvances');
  return amount(advances?.periodMinutesAdvanced);
}

function worldbuildingDomain(
  rows: WorldbuildingDomainStats[],
  domain: WorldbuildingDomainStats['domain'],
  field: 'periodCreated' | 'periodEdited',
): number {
  const row = rows.find((entry) => entry.domain === domain);
  return amount(row?.[field]);
}

/** Soft weights for ruleset v1. Tuned for tendency shape, not absolute volume. */
const WEIGHTS = {
  chronicler: {
    wordsAdded: 1,
    pagesEdited: 8,
    sessionMinutes: 0.5,
  },
  worldsmith: {
    created: 12,
    edited: 6,
  },
  cartographer: {
    created: 10,
    edited: 6,
  },
  timekeeper: {
    created: 10,
    edited: 6,
    hoursAdvanced: 2,
  },
  storyweaver: {
    campaignsGmed: 20,
    sessionsHosted: 15,
  },
  adventurer: {
    sessionsAttended: 15,
    charactersCreated: 10,
    charactersEdited: 5,
  },
  wanderer: {
    campaignsParticipated: 25,
    campaignsGmed: 5,
  },
} as const;

const WORLDSMITH_DOMAINS = new Set([
  'locations',
  'organizations',
  'families',
  'factions',
  'relationships',
  'creatures',
  'events',
  'eras',
  'custom',
]);

function axisAvailability(input: ArchetypeSignalInput): Record<PersonalArchetypeId, boolean> {
  const writingTracked =
    isTracked(input.wordsAdded) ||
    isTracked(input.pagesEdited) ||
    input.sessionMinutes > 0;
  const worldsmithTracked =
    worldbuildingTracked(input.worldbuilding, 'periodCreated', WORLDSMITH_DOMAINS) ||
    worldbuildingTracked(input.worldbuilding, 'periodEdited', WORLDSMITH_DOMAINS);
  const cartographyTracked =
    input.cartography.some((row) => isTracked(row.periodCreated) || isTracked(row.periodEdited));
  const chronologyTracked =
    input.chronology.some(
      (row) =>
        isTracked(row.periodCreated) ||
        isTracked(row.periodEdited) ||
        isTracked(row.periodMinutesAdvanced),
    );
  const storyweaverTracked =
    participationTracked(input.participation, 'campaignsGmed') ||
    participationTracked(input.participation, 'sessionsHosted');
  const adventurerTracked =
    participationTracked(input.participation, 'sessionsAttended') ||
    anyTracked([
      input.worldbuilding.find((row) => row.domain === 'characters')?.periodCreated,
      input.worldbuilding.find((row) => row.domain === 'characters')?.periodEdited,
    ]);
  const wandererTracked =
    participationTracked(input.participation, 'campaignsParticipated') ||
    participationTracked(input.participation, 'campaignsGmed');

  return {
    chronicler: writingTracked,
    worldsmith: worldsmithTracked,
    cartographer: cartographyTracked,
    timekeeper: chronologyTracked,
    storyweaver: storyweaverTracked,
    adventurer: adventurerTracked,
    wanderer: wandererTracked,
  };
}

function rawScores(input: ArchetypeSignalInput): Record<PersonalArchetypeId, number> {
  const wordsAdded = amount(input.wordsAdded);
  const pagesEdited = amount(input.pagesEdited);
  const sessionMinutes = Math.max(0, input.sessionMinutes);

  const worldsmithCreated = sumWorldbuilding(
    input.worldbuilding,
    'periodCreated',
    WORLDSMITH_DOMAINS,
  );
  const worldsmithEdited = sumWorldbuilding(
    input.worldbuilding,
    'periodEdited',
    WORLDSMITH_DOMAINS,
  );

  const cartographyCreated = sumCartography(input.cartography, 'periodCreated');
  const cartographyEdited = sumCartography(input.cartography, 'periodEdited');

  const chronologyCreated = sumChronology(input.chronology, 'periodCreated');
  const chronologyEdited = sumChronology(input.chronology, 'periodEdited');
  const hoursAdvanced = chronologyMinutesAdvanced(input.chronology) / 60;

  const campaignsGmed = participationPeriod(input.participation, 'campaignsGmed');
  const sessionsHosted = participationPeriod(input.participation, 'sessionsHosted');
  const sessionsAttended = participationPeriod(input.participation, 'sessionsAttended');
  const campaignsParticipated = participationPeriod(
    input.participation,
    'campaignsParticipated',
  );

  const charactersCreated = worldbuildingDomain(
    input.worldbuilding,
    'characters',
    'periodCreated',
  );
  const charactersEdited = worldbuildingDomain(
    input.worldbuilding,
    'characters',
    'periodEdited',
  );

  return {
    chronicler:
      wordsAdded * WEIGHTS.chronicler.wordsAdded +
      pagesEdited * WEIGHTS.chronicler.pagesEdited +
      sessionMinutes * WEIGHTS.chronicler.sessionMinutes,
    worldsmith:
      worldsmithCreated * WEIGHTS.worldsmith.created +
      worldsmithEdited * WEIGHTS.worldsmith.edited,
    cartographer:
      cartographyCreated * WEIGHTS.cartographer.created +
      cartographyEdited * WEIGHTS.cartographer.edited,
    timekeeper:
      chronologyCreated * WEIGHTS.timekeeper.created +
      chronologyEdited * WEIGHTS.timekeeper.edited +
      hoursAdvanced * WEIGHTS.timekeeper.hoursAdvanced,
    storyweaver:
      campaignsGmed * WEIGHTS.storyweaver.campaignsGmed +
      sessionsHosted * WEIGHTS.storyweaver.sessionsHosted,
    adventurer:
      sessionsAttended * WEIGHTS.adventurer.sessionsAttended +
      charactersCreated * WEIGHTS.adventurer.charactersCreated +
      charactersEdited * WEIGHTS.adventurer.charactersEdited,
    wanderer:
      campaignsParticipated * WEIGHTS.wanderer.campaignsParticipated +
      campaignsGmed * WEIGHTS.wanderer.campaignsGmed,
  };
}

/**
 * Largest-remainder normalization to four decimal places among measured axes.
 * Unavailable axes keep score null. Deterministic for equal remainders by
 * PERSONAL_ARCHETYPE_IDS order.
 */
export function normalizeArchetypeScores(
  raw: Record<PersonalArchetypeId, number>,
  measured: Record<PersonalArchetypeId, boolean>,
): PersonalArchetypes['scores'] {
  const measuredIds = PERSONAL_ARCHETYPE_IDS.filter((id) => measured[id]);
  const total = measuredIds.reduce((sum, id) => sum + Math.max(0, raw[id]), 0);

  if (measuredIds.length === 0) {
    return PERSONAL_ARCHETYPE_IDS.map((id) => ({
      id,
      score: null,
      availability: 'unavailable' as const,
    }));
  }

  if (total <= 0) {
    return PERSONAL_ARCHETYPE_IDS.map((id) =>
      measured[id]
        ? { id, score: 0, availability: 'measured' as const }
        : { id, score: null, availability: 'unavailable' as const },
    );
  }

  const exact = measuredIds.map((id) => {
    const share = Math.max(0, raw[id]) / total;
    const floored = Math.floor(share * 10_000) / 10_000;
    return { id, floored, remainder: share * 10_000 - floored * 10_000 };
  });
  let allocated = exact.reduce((sum, row) => sum + row.floored, 0);
  const leftovers = Math.round((1 - allocated) * 10_000);
  const byRemainder = [...exact].sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder;
    return PERSONAL_ARCHETYPE_IDS.indexOf(a.id) - PERSONAL_ARCHETYPE_IDS.indexOf(b.id);
  });
  for (let i = 0; i < leftovers; i += 1) {
    const target = byRemainder[i % byRemainder.length];
    if (!target) break;
    target.floored = Math.round((target.floored + 0.0001) * 10_000) / 10_000;
  }

  const byId = new Map(exact.map((row) => [row.id, row.floored]));
  return PERSONAL_ARCHETYPE_IDS.map((id) => {
    if (!measured[id]) {
      return { id, score: null, availability: 'unavailable' as const };
    }
    return {
      id,
      score: byId.get(id) ?? 0,
      availability: 'measured' as const,
    };
  });
}

export function assembleArchetypes(input: ArchetypeSignalInput): PersonalArchetypes | null {
  const measured = axisAvailability(input);
  const raw = rawScores(input);
  const scores = normalizeArchetypeScores(raw, measured);
  const measuredActivity = scores.some(
    (row) => row.availability === 'measured' && (row.score ?? 0) > 0,
  );
  if (!measuredActivity) return null;

  const dominant =
    [...scores]
      .filter((row) => row.availability === 'measured' && row.score != null)
      .sort((a, b) => {
        const delta = (b.score ?? 0) - (a.score ?? 0);
        if (delta !== 0) return delta;
        return PERSONAL_ARCHETYPE_IDS.indexOf(a.id) - PERSONAL_ARCHETYPE_IDS.indexOf(b.id);
      })[0] ?? null;

  return {
    rulesetVersion: PERSONAL_ARCHETYPE_RULESET_VERSION,
    scores,
    dominantId: dominant?.id ?? null,
  };
}
