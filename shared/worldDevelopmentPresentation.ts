/**
 * World Development — Progression inbox + settings presentation (browser-safe).
 */
import type {
  CampaignMonthlyBudget,
  DevelopmentAcceptTarget,
  DevelopmentRationaleLine,
  DevelopmentType,
} from './worldDevelopmentMetadata.js';
import {
  CAMPAIGN_MONTHLY_BUDGET_RANGES,
  DEFAULT_TYPE_LIFECYCLES,
  DEVELOPMENT_TYPES,
} from './worldDevelopmentMetadata.js';
import type { WorldDevelopmentMode } from './worldDevelopmentMetadata.js';
import type { WorldEventSuggestionTerminalStatus } from './worldEventSuggestionMetadata.js';
import { HISTORY_STATUS_FILTER_LABELS } from './worldEventSuggestionMetadata.js';

export type PendingDevelopmentSource = 'world_event' | 'reputation';

export type PendingDevelopmentRow = {
  id: string;
  source: PendingDevelopmentSource;
  status: 'pending';
  title: string;
  narrative: string | null;
  scopeLabel: string | null;
  scopeHref: string | null;
  occurredAtEpochMinute: string;
  kindLabel: string;
  rationale: DevelopmentRationaleLine[];
  confidence: 'low' | 'medium' | 'high' | null;
  proposedAcceptTarget: DevelopmentAcceptTarget | null;
  parentSuggestionId: string | null;
  chainStage: number | null;
  chainStageLabel: string | null;
  canResolve: boolean;
};

export type DevelopmentHistoryRow = {
  id: string;
  source: PendingDevelopmentSource;
  status: WorldEventSuggestionTerminalStatus;
  statusLabel: string;
  title: string;
  narrative: string | null;
  scopeLabel: string | null;
  occurredAtEpochMinute: string;
  resolvedAt: string | null;
  rationale: DevelopmentRationaleLine[];
  obsoleteReason: string | null;
  acceptedEventHref: string | null;
  resolvedBy: 'gm' | 'auto' | null;
  resultSummary: string | null;
};

/** GM-facing world activity tier (maps to campaignMonthlyBudget). */
export const WORLD_ACTIVITY_TIERS = ['quiet', 'moderate', 'active', 'custom'] as const;

export type WorldActivityTier = (typeof WORLD_ACTIVITY_TIERS)[number];

export const WORLD_ACTIVITY_LABELS: Record<WorldActivityTier, string> = {
  quiet: 'Quiet',
  moderate: 'Moderate',
  active: 'Active',
  custom: 'Custom',
};

export const WORLD_ACTIVITY_DESCRIPTIONS: Record<Exclude<WorldActivityTier, 'custom'>, string> = {
  quiet: 'Typically generates 1–3 developments per campaign month.',
  moderate: 'Typically generates 6–12 developments per campaign month.',
  active: 'Typically generates 12–20 developments per campaign month.',
};

const BUDGET_TO_ACTIVITY_TIER: Record<CampaignMonthlyBudget, WorldActivityTier> = {
  very_low: 'quiet',
  low: 'quiet',
  normal: 'moderate',
  high: 'active',
  custom: 'custom',
};

const ACTIVITY_TIER_TO_BUDGET: Record<WorldActivityTier, CampaignMonthlyBudget> = {
  quiet: 'very_low',
  moderate: 'normal',
  active: 'high',
  custom: 'custom',
};

export function worldActivityTierForBudget(budget: CampaignMonthlyBudget): WorldActivityTier {
  return BUDGET_TO_ACTIVITY_TIER[budget] ?? 'moderate';
}

export function campaignBudgetForActivityTier(tier: WorldActivityTier): CampaignMonthlyBudget {
  return ACTIVITY_TIER_TO_BUDGET[tier];
}

export function worldActivityLabelForBudget(budget: CampaignMonthlyBudget): string {
  return WORLD_ACTIVITY_LABELS[worldActivityTierForBudget(budget)];
}

export function worldActivityDescriptionForTier(tier: WorldActivityTier): string {
  if (tier === 'custom') {
    return 'Set a custom range for developments per campaign month.';
  }
  return WORLD_ACTIVITY_DESCRIPTIONS[tier];
}

export const WORLD_DEVELOPMENT_MODE_HEADLINES: Record<WorldDevelopmentMode, string> = {
  off: 'World Development off',
  manual: 'Manual Review',
  assisted: 'Assisted Review',
  auto_apply: 'Auto Apply',
};

export const WORLD_DEVELOPMENT_MODE_DESCRIPTIONS: Record<WorldDevelopmentMode, string> = {
  off: 'No living-world suggestions are generated.',
  manual: 'Every suggestion waits in your inbox for approval.',
  assisted: 'Minor developments may auto-apply; significant ones wait for review.',
  auto_apply: 'Eligible suggestions apply within world activity and cooldown limits.',
};

export const DEVELOPMENT_TYPE_LABELS: Record<DevelopmentType, string> = {
  war: 'War',
  leadership_change: 'Leadership change',
  leadership_challenge: 'Leadership challenge',
  trade_expansion: 'Trade expansion',
  diplomatic_overture: 'Diplomatic overture',
  border_incident: 'Border incident',
  succession_crisis: 'Succession crisis',
  merchant_unrest: 'Merchant unrest',
  merchant_dispute: 'Merchant dispute',
  territorial_claim: 'Territorial claim',
  alliance_proposal: 'Alliance proposal',
  regional_instability: 'Regional instability',
  harvest_shortage: 'Harvest shortage',
  trade_rumor: 'Trade rumor',
  faction_pressure: 'Faction pressure',
  era_trend: 'Era trend',
};

const CAMPAIGN_MONTH_MINUTES = 30 * 24 * 60;
const CAMPAIGN_WEEK_MINUTES = 7 * 24 * 60;
const CAMPAIGN_DAY_MINUTES = 24 * 60;

export function formatDevelopmentDuration(minutes: number): string {
  if (minutes <= 0) return 'None';
  if (minutes % CAMPAIGN_MONTH_MINUTES === 0) {
    const months = minutes / CAMPAIGN_MONTH_MINUTES;
    return months === 1 ? '1 campaign month' : `${months} campaign months`;
  }
  if (minutes % CAMPAIGN_WEEK_MINUTES === 0) {
    const weeks = minutes / CAMPAIGN_WEEK_MINUTES;
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  }
  if (minutes % CAMPAIGN_DAY_MINUTES === 0) {
    const days = minutes / CAMPAIGN_DAY_MINUTES;
    return days === 1 ? '1 day' : `${days} days`;
  }
  return `${minutes} minutes`;
}

export function developmentTypesBySignificance(
  significance: 'minor' | 'significant',
): DevelopmentType[] {
  return DEVELOPMENT_TYPES.filter(
    (type) => DEFAULT_TYPE_LIFECYCLES[type].significance === significance,
  );
}

export type WorldDevelopmentStatusSummary = {
  mode: WorldDevelopmentMode;
  modeHeadline: string;
  enabled: boolean;
  paused: boolean;
  pendingCount: number;
  generatedThisCampaignMonth: number;
  budgetMax: number;
  worldActivityLabel: string;
};

export type WorldDevelopmentReadinessIssueKind =
  | 'missing_trajectories'
  | 'no_campaign_time'
  | 'budget_exhausted'
  | 'world_pressure_paused'
  | 'mode_off'
  | 'no_pressure_signals';

export type WorldDevelopmentReadinessIssue = {
  kind: WorldDevelopmentReadinessIssueKind;
  message: string;
};

export type WorldDevelopmentReadiness = {
  healthy: boolean;
  issues: WorldDevelopmentReadinessIssue[];
  missingTrajectoryOrgs: Array<{ id: string; title: string }>;
  risingTensionsCount: number;
};

export type WorldDevelopmentSourceSignalsSummary = {
  usesFactionTrajectories: boolean;
  usesOrganizationWorldStates: boolean;
  usesScheduledEffects: boolean;
  scheduledEffectsActiveCount: number;
  usesCampaignTime: boolean;
  usesWorldPressureProjection: boolean;
  activeFactionCount: number;
  factionsWithSignalsCount: number;
  factionsMissingTrajectoryCount: number;
};

export type WorldDevelopmentPresentation = {
  settings: {
    mode: WorldDevelopmentMode;
    enabled: boolean;
    paused: boolean;
  };
  status: WorldDevelopmentStatusSummary;
  readiness: WorldDevelopmentReadiness;
  pending: PendingDevelopmentRow[];
  pendingCount: number;
};

export type WorldDevelopmentSettingsPayload = {
  settings: import('./worldDevelopmentMetadata.js').WorldDevelopmentSettings;
  sourceSignals: WorldDevelopmentSourceSignalsSummary;
};

export function historyStatusLabel(status: WorldEventSuggestionTerminalStatus): string {
  return HISTORY_STATUS_FILTER_LABELS[status];
}

export function budgetRangeLabelForTier(tier: WorldActivityTier): string | null {
  if (tier === 'custom') return null;
  const budget = campaignBudgetForActivityTier(tier);
  const range = CAMPAIGN_MONTHLY_BUDGET_RANGES[budget as Exclude<CampaignMonthlyBudget, 'custom'>];
  return `${range.min}–${range.max}`;
}
