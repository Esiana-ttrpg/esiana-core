/**
 * Layer 3 — World Development (optional, off by default).
 * @see docs/architecture-internal/world-development.md
 */

export const WORLD_DEVELOPMENT_SEMANTICS_VERSION = 'world-development-v1';

export const WORLD_DEVELOPMENT_MODES = ['off', 'manual', 'assisted', 'auto_apply'] as const;

export type WorldDevelopmentMode = (typeof WORLD_DEVELOPMENT_MODES)[number];

export const WORLD_DEVELOPMENT_MODE_LABELS: Record<WorldDevelopmentMode, string> = {
  off: 'Off',
  manual: 'Manual',
  assisted: 'Assisted',
  auto_apply: 'Auto Apply',
};

export const CAMPAIGN_MONTHLY_BUDGETS = [
  'very_low',
  'low',
  'normal',
  'high',
  'custom',
] as const;

export type CampaignMonthlyBudget = (typeof CAMPAIGN_MONTHLY_BUDGETS)[number];

export const CAMPAIGN_MONTHLY_BUDGET_RANGES: Record<
  Exclude<CampaignMonthlyBudget, 'custom'>,
  { min: number; max: number }
> = {
  very_low: { min: 1, max: 3 },
  low: { min: 3, max: 6 },
  normal: { min: 6, max: 12 },
  high: { min: 12, max: 20 },
};

export const DEVELOPMENT_TYPES = [
  'war',
  'leadership_change',
  'leadership_challenge',
  'trade_expansion',
  'diplomatic_overture',
  'border_incident',
  'succession_crisis',
  'merchant_unrest',
  'merchant_dispute',
  'territorial_claim',
  'alliance_proposal',
  'regional_instability',
  'harvest_shortage',
  'trade_rumor',
  'faction_pressure',
  'era_trend',
] as const;

/** Legacy ids → canonical development type. */
export const DEVELOPMENT_TYPE_ALIASES: Record<string, DevelopmentType> = {
  leadership_change: 'leadership_challenge',
};

export type DevelopmentType = (typeof DEVELOPMENT_TYPES)[number];

export const DEVELOPMENT_SIGNIFICANCE = ['minor', 'significant'] as const;

export type DevelopmentSignificance = (typeof DEVELOPMENT_SIGNIFICANCE)[number];

/** Campaign-time minutes (30-day month ≈ 43200 min). */
const MONTH_MINUTES = 30 * 24 * 60;
const WEEK_MINUTES = 7 * 24 * 60;

export type DevelopmentTypeLifecycle = {
  prepMinutes: number;
  cooldownMinutes: number;
  significance: DevelopmentSignificance;
};

export const DEFAULT_TYPE_LIFECYCLES: Record<DevelopmentType, DevelopmentTypeLifecycle> = {
  war: { prepMinutes: 3 * MONTH_MINUTES, cooldownMinutes: 12 * MONTH_MINUTES, significance: 'significant' },
  leadership_change: {
    prepMinutes: 1 * MONTH_MINUTES,
    cooldownMinutes: 6 * MONTH_MINUTES,
    significance: 'significant',
  },
  leadership_challenge: {
    prepMinutes: 1 * MONTH_MINUTES,
    cooldownMinutes: 6 * MONTH_MINUTES,
    significance: 'significant',
  },
  merchant_dispute: {
    prepMinutes: 0,
    cooldownMinutes: 2 * WEEK_MINUTES,
    significance: 'minor',
  },
  territorial_claim: {
    prepMinutes: 1 * MONTH_MINUTES,
    cooldownMinutes: 3 * MONTH_MINUTES,
    significance: 'significant',
  },
  alliance_proposal: {
    prepMinutes: 0,
    cooldownMinutes: 1 * MONTH_MINUTES,
    significance: 'minor',
  },
  regional_instability: {
    prepMinutes: 0,
    cooldownMinutes: 1 * MONTH_MINUTES,
    significance: 'minor',
  },
  trade_expansion: {
    prepMinutes: 2 * MONTH_MINUTES,
    cooldownMinutes: 3 * MONTH_MINUTES,
    significance: 'significant',
  },
  diplomatic_overture: {
    prepMinutes: 0,
    cooldownMinutes: 1 * MONTH_MINUTES,
    significance: 'minor',
  },
  border_incident: {
    prepMinutes: 0,
    cooldownMinutes: 2 * WEEK_MINUTES,
    significance: 'minor',
  },
  succession_crisis: {
    prepMinutes: 2 * MONTH_MINUTES,
    cooldownMinutes: 5 * 12 * MONTH_MINUTES,
    significance: 'significant',
  },
  merchant_unrest: {
    prepMinutes: 2 * WEEK_MINUTES,
    cooldownMinutes: 1 * MONTH_MINUTES,
    significance: 'minor',
  },
  harvest_shortage: {
    prepMinutes: 0,
    cooldownMinutes: 1 * MONTH_MINUTES,
    significance: 'minor',
  },
  trade_rumor: {
    prepMinutes: 0,
    cooldownMinutes: 2 * WEEK_MINUTES,
    significance: 'minor',
  },
  faction_pressure: {
    prepMinutes: 0,
    cooldownMinutes: 2 * WEEK_MINUTES,
    significance: 'minor',
  },
  era_trend: {
    prepMinutes: 0,
    cooldownMinutes: 1 * MONTH_MINUTES,
    significance: 'minor',
  },
};

export const PREP_CHAIN_STAGES: Partial<Record<DevelopmentType, string[]>> = {
  trade_expansion: ['Merchant lobbying begins', 'Trade negotiations', 'Trade route expansion'],
  war: ['Tensions escalate', 'Mobilization begins', 'War breaks out'],
  succession_crisis: ['Succession rumors spread', 'Claimants emerge', 'Succession crisis'],
};

export const RATIONALE_KINDS = [
  'trajectory',
  'pressure',
  'canon_signal',
  'scheduled',
  'cooldown',
  'budget',
  'prep_chain',
  'staleness_guard',
  'cooldown_blocked',
] as const;

export type RationaleKind = (typeof RATIONALE_KINDS)[number];

export type DevelopmentRationaleLine = {
  kind: RationaleKind;
  text: string;
};

export type DevelopmentConfidence = 'low' | 'medium' | 'high';

export type DevelopmentAcceptTarget =
  | 'calendar_event'
  | 'rumor'
  | 'quest_hook'
  | 'narrative_consequence'
  | 'faction_change';

export const DEVELOPMENT_ACCEPT_TARGETS = [
  'calendar_event',
  'rumor',
  'quest_hook',
  'narrative_consequence',
  'faction_change',
] as const;

export type DevelopmentDependencyRef = {
  kind: 'org' | 'region' | 'quest' | 'leadership';
  id: string;
};

export type DevelopmentPayload = {
  version: typeof WORLD_DEVELOPMENT_SEMANTICS_VERSION;
  developmentType: DevelopmentType;
  significance: DevelopmentSignificance;
  rationale: DevelopmentRationaleLine[];
  confidence: DevelopmentConfidence;
  dependencyRefs: DevelopmentDependencyRef[];
  obsoleteReason?: string | null;
  parentSuggestionId?: string | null;
  chainStage?: number | null;
  chainStageLabel?: string | null;
  chainStageCount?: number | null;
  proposedAcceptTarget?: DevelopmentAcceptTarget | null;
  advanceCycleAtCreation?: number | null;
  budgetAllocationRank?: number | null;
  resolvedBy?: 'gm' | 'auto' | null;
  acceptTarget?: DevelopmentAcceptTarget | null;
  acceptedArtifactId?: string | null;
  /** Registry definition id (core type or pluginId:slug). */
  definitionId?: string | null;
  /** Human-readable outcome for history UI. */
  resultSummary?: string | null;
};

export type WorldDevelopmentExpiration = {
  wallClockDays: number;
  maxAdvanceCycles: number;
};

export type WorldDevelopmentSettings = {
  version: typeof WORLD_DEVELOPMENT_SEMANTICS_VERSION;
  mode: WorldDevelopmentMode;
  campaignMonthlyBudget: CampaignMonthlyBudget;
  monthlyBudgetMin?: number;
  monthlyBudgetMax?: number;
  typeLifecycles: Record<DevelopmentType, DevelopmentTypeLifecycle>;
  maxPerFactionPerQuarter?: number;
  expiration: WorldDevelopmentExpiration;
  worldPressurePaused?: boolean;
};

export const FACTION_ACTIVITY_LEVELS = ['dormant', 'low', 'medium', 'high'] as const;

export type FactionActivityLevel = (typeof FACTION_ACTIVITY_LEVELS)[number];

export const DESIRED_DIRECTIONS = ['rising', 'stable', 'declining'] as const;

export type DesiredDirection = (typeof DESIRED_DIRECTIONS)[number];

export function createDefaultWorldDevelopmentSettings(): WorldDevelopmentSettings {
  return {
    version: WORLD_DEVELOPMENT_SEMANTICS_VERSION,
    mode: 'off',
    campaignMonthlyBudget: 'normal',
    typeLifecycles: { ...DEFAULT_TYPE_LIFECYCLES },
    expiration: {
      wallClockDays: 30,
      maxAdvanceCycles: 3,
    },
    worldPressurePaused: false,
  };
}

export function normalizeWorldDevelopmentMode(raw: unknown): WorldDevelopmentMode {
  if (typeof raw !== 'string') return 'off';
  const lower = raw.trim().toLowerCase();
  if (lower === 'automatic') return 'auto_apply';
  return WORLD_DEVELOPMENT_MODES.find((m) => m === lower) ?? 'off';
}

export function normalizeCampaignMonthlyBudget(raw: unknown): CampaignMonthlyBudget {
  if (typeof raw !== 'string') return 'normal';
  const lower = raw.trim().toLowerCase();
  return CAMPAIGN_MONTHLY_BUDGETS.find((b) => b === lower) ?? 'normal';
}

export function normalizeDevelopmentType(raw: unknown): DevelopmentType | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  const aliased = DEVELOPMENT_TYPE_ALIASES[lower];
  if (aliased) return aliased;
  return DEVELOPMENT_TYPES.find((t) => t === lower) ?? null;
}

/** Plugin definition ids use `pluginId:slug`; core ids match developmentType. */
export function normalizeDefinitionId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes(':')) return trimmed;
  const asType = normalizeDevelopmentType(trimmed);
  return asType ?? trimmed;
}

export function normalizeDevelopmentAcceptTarget(raw: unknown): DevelopmentAcceptTarget | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  return DEVELOPMENT_ACCEPT_TARGETS.find((t) => t === lower) ?? null;
}

function normalizeTypeLifecycles(
  raw: unknown,
): Record<DevelopmentType, DevelopmentTypeLifecycle> {
  const base = { ...DEFAULT_TYPE_LIFECYCLES };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const obj = raw as Record<string, unknown>;
  for (const type of DEVELOPMENT_TYPES) {
    const entry = obj[type];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const e = entry as Record<string, unknown>;
    const prep = typeof e.prepMinutes === 'number' ? Math.max(0, e.prepMinutes) : base[type].prepMinutes;
    const cooldown =
      typeof e.cooldownMinutes === 'number' ? Math.max(0, e.cooldownMinutes) : base[type].cooldownMinutes;
    const sig =
      e.significance === 'significant' || e.significance === 'minor'
        ? e.significance
        : base[type].significance;
    base[type] = { prepMinutes: prep, cooldownMinutes: cooldown, significance: sig };
  }
  return base;
}

function normalizeRationaleLine(raw: unknown): DevelopmentRationaleLine | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const kind = RATIONALE_KINDS.find((k) => k === obj.kind) ?? null;
  const text = typeof obj.text === 'string' ? obj.text.trim().slice(0, 300) : '';
  if (!kind || !text) return null;
  return { kind, text };
}

export function normalizeDevelopmentPayload(raw: unknown): DevelopmentPayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const developmentType = normalizeDevelopmentType(obj.developmentType);
  if (!developmentType) return null;
  const significance =
    obj.significance === 'significant' || obj.significance === 'minor'
      ? obj.significance
      : DEFAULT_TYPE_LIFECYCLES[developmentType].significance;
  const rationaleRaw = Array.isArray(obj.rationale) ? obj.rationale : [];
  const rationale = rationaleRaw
    .map(normalizeRationaleLine)
    .filter((line): line is DevelopmentRationaleLine => line !== null);
  const confidence =
    obj.confidence === 'low' || obj.confidence === 'medium' || obj.confidence === 'high'
      ? obj.confidence
      : 'medium';
  const dependencyRefs: DevelopmentDependencyRef[] = [];
  if (Array.isArray(obj.dependencyRefs)) {
    for (const ref of obj.dependencyRefs) {
      if (!ref || typeof ref !== 'object' || Array.isArray(ref)) continue;
      const r = ref as Record<string, unknown>;
      const kind = r.kind;
      const id = typeof r.id === 'string' ? r.id.trim() : '';
      if (
        (kind === 'org' || kind === 'region' || kind === 'quest' || kind === 'leadership') &&
        id
      ) {
        dependencyRefs.push({ kind, id });
      }
    }
  }
  return {
    version: WORLD_DEVELOPMENT_SEMANTICS_VERSION,
    developmentType,
    significance,
    rationale,
    confidence,
    dependencyRefs,
    obsoleteReason:
      typeof obj.obsoleteReason === 'string' ? obj.obsoleteReason.slice(0, 500) : null,
    parentSuggestionId:
      typeof obj.parentSuggestionId === 'string' ? obj.parentSuggestionId : null,
    chainStage: typeof obj.chainStage === 'number' ? obj.chainStage : null,
    chainStageLabel: typeof obj.chainStageLabel === 'string' ? obj.chainStageLabel : null,
    chainStageCount: typeof obj.chainStageCount === 'number' ? obj.chainStageCount : null,
    proposedAcceptTarget: normalizeDevelopmentAcceptTarget(obj.proposedAcceptTarget),
    advanceCycleAtCreation:
      typeof obj.advanceCycleAtCreation === 'number' ? obj.advanceCycleAtCreation : null,
    budgetAllocationRank:
      typeof obj.budgetAllocationRank === 'number' ? obj.budgetAllocationRank : null,
    resolvedBy: obj.resolvedBy === 'gm' || obj.resolvedBy === 'auto' ? obj.resolvedBy : null,
    acceptTarget: normalizeDevelopmentAcceptTarget(obj.acceptTarget),
    acceptedArtifactId:
      typeof obj.acceptedArtifactId === 'string' ? obj.acceptedArtifactId : null,
    definitionId: typeof obj.definitionId === 'string' ? obj.definitionId : null,
    resultSummary: typeof obj.resultSummary === 'string' ? obj.resultSummary.slice(0, 500) : null,
  };
}

export function serializeDevelopmentPayload(payload: DevelopmentPayload): Record<string, unknown> {
  return { ...payload };
}

export function parseWorldDevelopmentSettings(raw: unknown): WorldDevelopmentSettings {
  const defaults = createDefaultWorldDevelopmentSettings();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
  const obj = raw as Record<string, unknown>;
  const budget = normalizeCampaignMonthlyBudget(obj.campaignMonthlyBudget);
  let monthlyBudgetMin = defaults.monthlyBudgetMin;
  let monthlyBudgetMax = defaults.monthlyBudgetMax;
  if (budget === 'custom') {
    if (typeof obj.monthlyBudgetMin === 'number' && Number.isFinite(obj.monthlyBudgetMin)) {
      monthlyBudgetMin = Math.max(0, Math.round(obj.monthlyBudgetMin));
    }
    if (typeof obj.monthlyBudgetMax === 'number' && Number.isFinite(obj.monthlyBudgetMax)) {
      monthlyBudgetMax = Math.max(1, Math.round(obj.monthlyBudgetMax));
    }
  }
  const expirationRaw = obj.expiration;
  let expiration = defaults.expiration;
  if (expirationRaw && typeof expirationRaw === 'object' && !Array.isArray(expirationRaw)) {
    const e = expirationRaw as Record<string, unknown>;
    expiration = {
      wallClockDays:
        typeof e.wallClockDays === 'number' && e.wallClockDays > 0
          ? Math.round(e.wallClockDays)
          : defaults.expiration.wallClockDays,
      maxAdvanceCycles:
        typeof e.maxAdvanceCycles === 'number' && e.maxAdvanceCycles > 0
          ? Math.round(e.maxAdvanceCycles)
          : defaults.expiration.maxAdvanceCycles,
    };
  }
  return {
    version: WORLD_DEVELOPMENT_SEMANTICS_VERSION,
    mode: normalizeWorldDevelopmentMode(obj.mode),
    campaignMonthlyBudget: budget,
    monthlyBudgetMin,
    monthlyBudgetMax,
    typeLifecycles: normalizeTypeLifecycles(obj.typeLifecycles),
    maxPerFactionPerQuarter:
      typeof obj.maxPerFactionPerQuarter === 'number'
        ? Math.max(1, Math.round(obj.maxPerFactionPerQuarter))
        : undefined,
    expiration,
    worldPressurePaused: obj.worldPressurePaused === true,
  };
}

export function isWorldDevelopmentEnabled(settings: WorldDevelopmentSettings): boolean {
  return settings.mode !== 'off' && !settings.worldPressurePaused;
}

export function shouldAutoApplySuggestion(
  settings: WorldDevelopmentSettings,
  significance: DevelopmentSignificance,
): boolean {
  if (settings.mode === 'auto_apply') return true;
  if (settings.mode === 'assisted' && significance === 'minor') return true;
  return false;
}

export function resolveMonthlyBudgetRange(settings: WorldDevelopmentSettings): {
  min: number;
  max: number;
} {
  if (settings.campaignMonthlyBudget === 'custom') {
    return {
      min: settings.monthlyBudgetMin ?? 1,
      max: settings.monthlyBudgetMax ?? 12,
    };
  }
  return CAMPAIGN_MONTHLY_BUDGET_RANGES[settings.campaignMonthlyBudget];
}

/** Slots for a time advance window from monthly budget. */
export function computeBudgetSlotsForAdvance(
  settings: WorldDevelopmentSettings,
  elapsedCampaignMinutes: number,
): number {
  const { min, max } = resolveMonthlyBudgetRange(settings);
  const monthFraction = Math.min(1, elapsedCampaignMinutes / MONTH_MINUTES);
  const raw = min + (max - min) * monthFraction;
  return Math.max(0, Math.round(raw));
}

export function deriveConfidenceFromRationale(
  rationale: DevelopmentRationaleLine[],
): DevelopmentConfidence {
  if (rationale.length >= 4) return 'high';
  if (rationale.length >= 2) return 'medium';
  return 'low';
}

export function formatWorldDevelopmentModeLabel(mode: WorldDevelopmentMode): string {
  return WORLD_DEVELOPMENT_MODE_LABELS[mode];
}
