/**
 * Layer 3 — creative drift (narrative thermodynamics inbox).
 * Browser-safe types/constants only — fingerprints live in creativeDriftFingerprint.ts.
 * @see docs/architecture-internal/creative-drift.md
 */

export const CREATIVE_DRIFT_VERSION = 'creative-drift-v1';

/** Surfaced in v1 UI */
export const CREATIVE_DRIFT_ACTIVE_BUCKETS = [
  'dormant_plotlines',
  'unused_entities',
  'hanging_promises',
  'emotional_residue',
] as const;

/** Reserved — not computed or surfaced in v1 */
export const CREATIVE_DRIFT_RESERVED_BUCKETS = ['ambient_residue'] as const;

export const CREATIVE_DRIFT_BUCKETS = [
  ...CREATIVE_DRIFT_ACTIVE_BUCKETS,
  ...CREATIVE_DRIFT_RESERVED_BUCKETS,
] as const;

export type CreativeDriftBucket = (typeof CREATIVE_DRIFT_BUCKETS)[number];
export type CreativeDriftActiveBucket = (typeof CREATIVE_DRIFT_ACTIVE_BUCKETS)[number];

export const DRIFT_SUBJECT_KINDS = [
  'open_thread',
  'quest',
  'wiki_page',
  'branch_node',
] as const;

export type DriftSubjectKind = (typeof DRIFT_SUBJECT_KINDS)[number];

export const DRIFT_COOLING_BANDS = ['recent', 'moderate', 'long'] as const;
export type DriftCoolingBand = (typeof DRIFT_COOLING_BANDS)[number];

export const DRIFT_REACTIVATION_STATES = ['none', 'recently_reawakened'] as const;
export type DriftReactivationState = (typeof DRIFT_REACTIVATION_STATES)[number];

export const DRIFT_DISPOSITION_KINDS = [
  'intentional',
  'revive_later',
  'archived',
  'snoozed',
] as const;

export type DriftDispositionKind = (typeof DRIFT_DISPOSITION_KINDS)[number];

export const REAWAKENED_DAYS_WINDOW = 14;
export const COOLING_RECENT_DAYS = 30;
export const COOLING_LONG_DAYS = 60;

export const CREATIVE_DRIFT_BUCKET_UI_LABELS: Record<CreativeDriftActiveBucket, string> = {
  dormant_plotlines: 'Dormant plotlines',
  unused_entities: 'Dormant figures & factions',
  hanging_promises: 'Unresolved promises',
  emotional_residue: 'Emotional beats',
};

export const COOLING_BAND_UI_LABELS: Record<DriftCoolingBand, string> = {
  recent: "Hasn't appeared recently",
  moderate: 'Quietly lingering',
  long: 'Long unrevisited',
};

export type CreativeDriftDisposition = {
  kind: DriftDispositionKind;
  notedAt: string;
  snoozeUntil?: string | null;
  note?: string | null;
  byUserId?: string | null;
};

export type CreativeDriftDispositionMap = Record<string, CreativeDriftDisposition>;

export type CreativeDriftFinding = {
  fingerprint: string;
  bucket: CreativeDriftActiveBucket;
  subjectKind: DriftSubjectKind;
  subjectId: string;
  title: string;
  statusLabel: string;
  coolingBand: DriftCoolingBand;
  reactivationState: DriftReactivationState;
  narrativeWeight: 'minor' | 'major' | 'critical';
  lastReferencedAt: string | null;
  introducedSessionId: string | null;
  linkedEntityIds: string[];
  linkedEntityTitles?: Record<string, string>;
  reactivationCopy?: string | null;
  /** Sort key only — never expose in UI */
  _sortKey?: number;
};

export type CreativeDriftReawakenedItem = {
  fingerprint: string;
  subjectKind: DriftSubjectKind;
  subjectId: string;
  title: string;
  reactivationCopy: string;
  lastReferencedAt: string;
  linkedEntityIds: string[];
};

export type CreativeDriftBucketPayload = {
  bucket: CreativeDriftActiveBucket;
  label: string;
  items: CreativeDriftFinding[];
};

export type CreativeDriftSummary = {
  totalActive: number;
  byBucket: Record<CreativeDriftActiveBucket, number>;
  reawakenedCount: number;
  acknowledgedCount: number;
};

export type CreativeDriftScanResult = {
  version: typeof CREATIVE_DRIFT_VERSION;
  generatedAt: string;
  buckets: CreativeDriftBucketPayload[];
  reawakened: CreativeDriftReawakenedItem[];
  acknowledged: CreativeDriftFinding[];
  summary: CreativeDriftSummary;
};

export function parseCreativeDriftDispositionMap(raw: unknown): CreativeDriftDispositionMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: CreativeDriftDispositionMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    const kind = row.kind;
    if (
      typeof kind !== 'string' ||
      !(DRIFT_DISPOSITION_KINDS as readonly string[]).includes(kind)
    ) {
      continue;
    }
    const notedAt = typeof row.notedAt === 'string' ? row.notedAt : new Date().toISOString();
    out[key] = {
      kind: kind as DriftDispositionKind,
      notedAt,
      snoozeUntil:
        typeof row.snoozeUntil === 'string' ? row.snoozeUntil : null,
      note: typeof row.note === 'string' ? row.note : null,
      byUserId: typeof row.byUserId === 'string' ? row.byUserId : null,
    };
  }
  return out;
}

export function isDispositionActive(
  disposition: CreativeDriftDisposition | undefined,
  now: Date = new Date(),
): 'hidden' | 'acknowledged' {
  if (!disposition) return 'hidden';
  if (disposition.kind === 'snoozed' && disposition.snoozeUntil) {
    const until = new Date(disposition.snoozeUntil);
    if (!Number.isNaN(until.getTime()) && until > now) {
      return 'hidden';
    }
    return 'hidden';
  }
  if (
    disposition.kind === 'intentional' ||
    disposition.kind === 'archived' ||
    disposition.kind === 'revive_later'
  ) {
    return 'acknowledged';
  }
  return 'hidden';
}

export function isDispositionSnoozedHidden(
  disposition: CreativeDriftDisposition | undefined,
  now: Date = new Date(),
): boolean {
  if (!disposition || disposition.kind !== 'snoozed') return false;
  if (!disposition.snoozeUntil) return true;
  const until = new Date(disposition.snoozeUntil);
  return !Number.isNaN(until.getTime()) && until > now;
}

export function weightMultiplier(weight: 'minor' | 'major' | 'critical'): number {
  switch (weight) {
    case 'critical':
      return 3;
    case 'major':
      return 2;
    default:
      return 1;
  }
}

export function computeCoolingBand(daysSinceReference: number): DriftCoolingBand {
  if (daysSinceReference < COOLING_RECENT_DAYS) return 'recent';
  if (daysSinceReference < COOLING_LONG_DAYS) return 'moderate';
  return 'long';
}

export function computeCoolingScore(
  daysSinceReference: number,
  weight: 'minor' | 'major' | 'critical',
): number {
  return daysSinceReference * weightMultiplier(weight);
}

export function sortDriftFindings(a: CreativeDriftFinding, b: CreativeDriftFinding): number {
  const weightOrder = { critical: 0, major: 1, minor: 2 };
  const wa = weightOrder[a.narrativeWeight];
  const wb = weightOrder[b.narrativeWeight];
  if (wa !== wb) return wa - wb;
  return (b._sortKey ?? 0) - (a._sortKey ?? 0);
}
