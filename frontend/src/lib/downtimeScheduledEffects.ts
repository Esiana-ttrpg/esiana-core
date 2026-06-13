import { apiFetch } from './api';
import type { ScheduledTreasuryScheduleLine } from '@shared/downtimeHub';
import type {
  NarrativeScheduledEffectKind,
  ScheduledEffectOccurrenceStatus,
  ScheduledEffectSummary,
} from '@shared/scheduledEffectMetadata';

export type TreasuryScheduledEffectKind = 'ledger_upkeep' | 'ledger_income';
export type ScheduledEffectKind = TreasuryScheduledEffectKind;

export type RecurrencePreset =
  | 'weekly'
  | 'biweekly'
  | 'monthly_calendar'
  | 'every_7_days'
  | 'every_14_days'
  | 'every_30_days';

export type CreateTreasuryScheduledEffectInput = {
  effectKind: TreasuryScheduledEffectKind;
  title: string;
  narrative?: string | null;
  amount: number;
  recurrencePreset: RecurrencePreset;
  dayOfMonth?: number;
  havenWikiPageId?: string | null;
};

export type CreateNarrativeScheduledEffectInput = {
  effectKind: NarrativeScheduledEffectKind;
  title: string;
  narrative?: string | null;
  recurrencePreset: RecurrencePreset;
  dayOfMonth?: number;
  primaryOrgPageId?: string | null;
  havenWikiPageId?: string | null;
};

/** @deprecated Use CreateTreasuryScheduledEffectInput */
export type CreateScheduledEffectInput = CreateTreasuryScheduledEffectInput;

export type ScheduledEffectDetail = ScheduledTreasuryScheduleLine & {
  narrative: string | null;
  anchorEpochMinute: string;
  nextFireEpochMinute: string;
  lastFiredEpochMinute: string | null;
};

export type NarrativeScheduledEffectDetail = ScheduledEffectSummary;

const PREFILL_STORAGE_KEY = 'downtime-scheduled-treasury-prefill';

export type ScheduledTreasuryPrefill = {
  effectKind: TreasuryScheduledEffectKind;
  title: string;
  amount: number;
  havenWikiPageId?: string | null;
  recurrencePreset?: RecurrencePreset;
};

export function storeScheduledTreasuryPrefill(prefill: ScheduledTreasuryPrefill): void {
  sessionStorage.setItem(PREFILL_STORAGE_KEY, JSON.stringify(prefill));
}

export function consumeScheduledTreasuryPrefill(): ScheduledTreasuryPrefill | null {
  const raw = sessionStorage.getItem(PREFILL_STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PREFILL_STORAGE_KEY);
  try {
    return JSON.parse(raw) as ScheduledTreasuryPrefill;
  } catch {
    return null;
  }
}

export async function listScheduledEffects(
  campaignHandle: string,
): Promise<ScheduledEffectDetail[]> {
  const response = await apiFetch<{ schedules: ScheduledEffectDetail[] }>(
    `/campaigns/${campaignHandle}/downtime/scheduled-effects?scope=treasury`,
  );
  return response.schedules;
}

export async function listNarrativeScheduledEffects(
  campaignHandle: string,
): Promise<NarrativeScheduledEffectDetail[]> {
  const response = await apiFetch<{ schedules: NarrativeScheduledEffectDetail[] }>(
    `/campaigns/${campaignHandle}/downtime/scheduled-effects?scope=narrative`,
  );
  return response.schedules;
}

export async function createScheduledEffect(
  campaignHandle: string,
  input: CreateTreasuryScheduledEffectInput,
): Promise<ScheduledEffectDetail> {
  const response = await apiFetch<{ schedule: ScheduledEffectDetail }>(
    `/campaigns/${campaignHandle}/downtime/scheduled-effects`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return response.schedule;
}

export async function createNarrativeScheduledEffect(
  campaignHandle: string,
  input: CreateNarrativeScheduledEffectInput,
): Promise<NarrativeScheduledEffectDetail> {
  const response = await apiFetch<{ schedule: NarrativeScheduledEffectDetail }>(
    `/campaigns/${campaignHandle}/downtime/scheduled-effects`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return response.schedule;
}

export async function updateScheduledEffect(
  campaignHandle: string,
  scheduleId: string,
  input: {
    status?: 'active' | 'paused' | 'archived';
    title?: string;
    amount?: number;
  },
): Promise<ScheduledEffectDetail> {
  const response = await apiFetch<{ schedule: ScheduledEffectDetail }>(
    `/campaigns/${campaignHandle}/downtime/scheduled-effects/${scheduleId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
  return response.schedule;
}

export async function archiveScheduledEffect(
  campaignHandle: string,
  scheduleId: string,
): Promise<ScheduledEffectDetail> {
  const response = await apiFetch<{ schedule: ScheduledEffectDetail }>(
    `/campaigns/${campaignHandle}/downtime/scheduled-effects/${scheduleId}`,
    { method: 'DELETE' },
  );
  return response.schedule;
}

export function formatLastOutcomeLabel(
  lastOutcome: ScheduledEffectOccurrenceStatus | null,
  lastSuppressionReasonLabel: string | null,
): string | null {
  if (!lastOutcome) return null;
  if (lastOutcome === 'fired') return 'Generated';
  return lastSuppressionReasonLabel
    ? `Suppressed (${lastSuppressionReasonLabel})`
    : 'Suppressed';
}
