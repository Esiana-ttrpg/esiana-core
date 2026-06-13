/**
 * Layer 1 — campaign economic ledger contracts.
 * Distinct from Investigation dependency ledger and dashboard quest/thread ledgers.
 * @see docs/architecture-internal/downtime-ledger.md
 */

export const CAMPAIGN_LEDGER_SEMANTICS_VERSION = 'campaign-ledger-v1';

export const LEDGER_ENTRY_KINDS = [
  'credit',
  'debit',
  'debt_open',
  'debt_payment',
] as const;

export type LedgerEntryKind = (typeof LEDGER_ENTRY_KINDS)[number];

export const LEDGER_CATEGORIES = [
  'upkeep',
  'project',
  'income',
  'reward',
  'trade',
  'donation',
  'debt',
  'other',
] as const;

export type LedgerCategory = (typeof LEDGER_CATEGORIES)[number];

export const LEDGER_ENTRY_SOURCES = ['manual', 'system'] as const;

export type LedgerEntrySource = (typeof LEDGER_ENTRY_SOURCES)[number];

export const LEDGER_DEBT_STATUSES = ['open', 'settled'] as const;

export type LedgerDebtStatus = (typeof LEDGER_DEBT_STATUSES)[number];

export type LedgerDebtMeta = {
  status: LedgerDebtStatus;
  settledAtEpochMinute?: string | null;
};

export const DEFAULT_CURRENCY_LABEL = 'gold';
export const DEFAULT_CURRENCY_SUFFIX = 'g';
export const LEDGER_NARRATIVE_MAX_LENGTH = 120;

export type CampaignLedgerSettings = {
  currencyLabel: string;
  currencySuffix: string;
  openingBalance: number;
  sharedTreasuryEnabled: boolean;
  semanticsVersion: string;
};

export type CampaignLedgerEntryCore = {
  id: string;
  entryKind: LedgerEntryKind;
  category: LedgerCategory;
  title: string;
  narrative: string | null;
  amount: number;
  occurredAtEpochMinute: string;
  projectId: string | null;
  havenWikiPageId: string | null;
  debtMeta: LedgerDebtMeta | null;
  source: LedgerEntrySource;
  contributorPageId: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignLedgerDetail = CampaignLedgerSettings & {
  id: string;
  campaignId: string;
  balance: number;
  openDebts: LedgerDebtSummary[];
};

export type CampaignLedgerEntryDetail = CampaignLedgerEntryCore & {
  projectTitle: string | null;
  havenTitle: string | null;
  contributorTitle: string | null;
  projectHref: string | null;
  havenHref: string | null;
  contributorHref: string | null;
};

export type LedgerDebtSummary = {
  entryId: string;
  title: string;
  amount: number;
  narrative: string | null;
};

const CATEGORY_LABELS: Record<LedgerCategory, string> = {
  upkeep: 'Upkeep',
  project: 'Project',
  income: 'Income',
  reward: 'Reward',
  trade: 'Trade',
  donation: 'Donation',
  debt: 'Debt',
  other: 'Other',
};

export function formatLedgerCategoryLabel(category: LedgerCategory): string {
  return CATEGORY_LABELS[category] ?? 'Other';
}

export function normalizeLedgerEntryKind(raw: unknown): LedgerEntryKind | null {
  if (typeof raw !== 'string') return null;
  const lower = raw.trim().toLowerCase();
  return LEDGER_ENTRY_KINDS.find((kind) => kind === lower) ?? null;
}

export function normalizeLedgerCategory(raw: unknown): LedgerCategory {
  if (typeof raw !== 'string') return 'other';
  const lower = raw.trim().toLowerCase();
  return LEDGER_CATEGORIES.find((category) => category === lower) ?? 'other';
}

export function normalizeLedgerNarrative(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, LEDGER_NARRATIVE_MAX_LENGTH);
}

export function normalizeLedgerAmount(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const value = Math.floor(raw);
    return value > 0 ? value : null;
  }
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number.parseInt(raw.trim(), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

export function parseLedgerDebtMeta(raw: unknown): LedgerDebtMeta | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const statusRaw = record.status;
  const status =
    typeof statusRaw === 'string' &&
    LEDGER_DEBT_STATUSES.includes(statusRaw as LedgerDebtStatus)
      ? (statusRaw as LedgerDebtStatus)
      : null;
  if (!status) return null;
  const settledAtEpochMinute =
    typeof record.settledAtEpochMinute === 'string'
      ? record.settledAtEpochMinute
      : null;
  return { status, settledAtEpochMinute };
}

export function defaultDebtMetaForKind(kind: LedgerEntryKind): LedgerDebtMeta | null {
  if (kind === 'debt_open') return { status: 'open' };
  return null;
}

export function formatLedgerAmountLabel(input: {
  entryKind: LedgerEntryKind;
  amount: number;
  suffix: string;
}): string {
  const suffix = input.suffix.trim() || DEFAULT_CURRENCY_SUFFIX;
  const magnitude = Math.abs(input.amount).toLocaleString('en-US');
  switch (input.entryKind) {
    case 'credit':
    case 'debt_payment':
      return `+${magnitude}${suffix}`;
    case 'debit':
      return `-${magnitude}${suffix}`;
    case 'debt_open':
      return `${magnitude}${suffix} owed`;
    default:
      return `${magnitude}${suffix}`;
  }
}

export function formatLedgerBalanceLabel(balance: number, suffix: string): string {
  const normalizedSuffix = suffix.trim() || DEFAULT_CURRENCY_SUFFIX;
  return `${balance.toLocaleString('en-US')}${normalizedSuffix}`;
}

export function entryAffectsTreasury(entryKind: LedgerEntryKind): boolean {
  return entryKind === 'credit' || entryKind === 'debit' || entryKind === 'debt_payment';
}

export function treasuryDeltaForEntry(input: {
  entryKind: LedgerEntryKind;
  amount: number;
}): number {
  switch (input.entryKind) {
    case 'credit':
    case 'debt_payment':
      return input.amount;
    case 'debit':
      return -input.amount;
    default:
      return 0;
  }
}

export type LedgerBalanceEntry = Pick<
  CampaignLedgerEntryCore,
  'entryKind' | 'amount' | 'debtMeta'
>;

export function computeLedgerBalance(
  ledger: Pick<CampaignLedgerSettings, 'openingBalance'>,
  entries: LedgerBalanceEntry[],
): number {
  let balance = ledger.openingBalance;
  for (const entry of entries) {
    balance += treasuryDeltaForEntry({
      entryKind: entry.entryKind,
      amount: entry.amount,
    });
  }
  return balance;
}

export function summarizeOpenDebts(
  entries: Array<
    Pick<CampaignLedgerEntryCore, 'id' | 'title' | 'amount' | 'narrative' | 'entryKind' | 'debtMeta'>
  >,
): LedgerDebtSummary[] {
  return entries
    .filter(
      (entry) =>
        entry.entryKind === 'debt_open' &&
        (entry.debtMeta?.status ?? 'open') === 'open',
    )
    .map((entry) => ({
      entryId: entry.id,
      title: entry.title,
      amount: entry.amount,
      narrative: entry.narrative,
    }));
}

export function formatOpenDebtsSummary(debts: LedgerDebtSummary[], suffix: string): string | null {
  if (debts.length === 0) return null;
  const normalizedSuffix = suffix.trim() || DEFAULT_CURRENCY_SUFFIX;
  if (debts.length === 1) {
    const debt = debts[0]!;
    return `${debt.amount.toLocaleString('en-US')}${normalizedSuffix} outstanding — ${debt.title}`;
  }
  const total = debts.reduce((sum, debt) => sum + debt.amount, 0);
  return `${debts.length} open debts · ${total.toLocaleString('en-US')}${normalizedSuffix} outstanding`;
}

export function ledgerEntryTone(
  entryKind: LedgerEntryKind,
  category: LedgerCategory,
): 'neutral' | 'warning' | 'escalation' {
  if (entryKind === 'debt_open') return 'escalation';
  if (entryKind === 'debit' && (category === 'upkeep' || category === 'project')) {
    return 'warning';
  }
  if (entryKind === 'credit') return 'neutral';
  return 'neutral';
}

// --- Treasury suggestions (Phase 4 — human-approved only) ---

export const LEDGER_SUGGESTION_STATUSES = ['pending', 'accepted', 'dismissed'] as const;

export type LedgerSuggestionStatus = (typeof LEDGER_SUGGESTION_STATUSES)[number];

export const LEDGER_SUGGESTION_SOURCE_TYPES = [
  'project_completion',
  'haven_upkeep',
  'scheduled_effect',
  'trade_event',
  'quest_reward',
  'other',
] as const;

export type LedgerSuggestionSourceType = (typeof LEDGER_SUGGESTION_SOURCE_TYPES)[number];

export const LEDGER_SUGGESTION_CONFIDENCE_LEVELS = ['inferred', 'authored'] as const;

export type LedgerSuggestionConfidence = (typeof LEDGER_SUGGESTION_CONFIDENCE_LEVELS)[number];

export type CampaignLedgerSuggestionCore = {
  id: string;
  status: LedgerSuggestionStatus;
  entryKind: LedgerEntryKind;
  category: LedgerCategory;
  title: string;
  narrative: string | null;
  amount: number | null;
  occurredAtEpochMinute: string;
  sourceType: LedgerSuggestionSourceType;
  sourceRef: string;
  projectId: string | null;
  havenWikiPageId: string | null;
  confidence: LedgerSuggestionConfidence;
  acceptedEntryId: string | null;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignLedgerSuggestionDetail = CampaignLedgerSuggestionCore & {
  amountLabel: string | null;
  categoryLabel: string;
  projectTitle: string | null;
  havenTitle: string | null;
  projectHref: string | null;
  havenHref: string | null;
  canResolve: boolean;
};

export type EmitLedgerSuggestionInput = {
  campaignId: string;
  idempotencyKey: string;
  sourceType: LedgerSuggestionSourceType;
  sourceRef: string;
  entryKind: LedgerEntryKind;
  category: LedgerCategory;
  title: string;
  narrative?: string | null;
  amount?: number | null;
  occurredAtEpochMinute: string | bigint;
  projectId?: string | null;
  havenWikiPageId?: string | null;
  confidence?: LedgerSuggestionConfidence;
};

export function normalizeLedgerSuggestionStatus(raw: unknown): LedgerSuggestionStatus {
  if (typeof raw !== 'string') return 'pending';
  const lower = raw.trim().toLowerCase();
  return LEDGER_SUGGESTION_STATUSES.find((status) => status === lower) ?? 'pending';
}

export function normalizeLedgerSuggestionSourceType(
  raw: unknown,
): LedgerSuggestionSourceType {
  if (typeof raw !== 'string') return 'other';
  const lower = raw.trim().toLowerCase();
  return LEDGER_SUGGESTION_SOURCE_TYPES.find((type) => type === lower) ?? 'other';
}

export function normalizeLedgerSuggestionConfidence(
  raw: unknown,
): LedgerSuggestionConfidence {
  if (typeof raw !== 'string') return 'inferred';
  const lower = raw.trim().toLowerCase();
  return LEDGER_SUGGESTION_CONFIDENCE_LEVELS.find((level) => level === lower) ?? 'inferred';
}

export function normalizeOptionalLedgerAmount(raw: unknown): number | null {
  if (raw == null) return null;
  return normalizeLedgerAmount(raw);
}

export function buildProjectCompletionSuggestionKey(projectId: string, runId: string): string {
  return `project-completion:${projectId}:${runId}`;
}

export function buildTradeEventSuggestionKey(effectId: string): string {
  return `trade-event:${effectId}`;
}

export function buildQuestRewardSuggestionKey(questPageId: string, transitionId: string): string {
  return `quest-reward:${questPageId}:${transitionId}`;
}

export function buildHavenUpkeepSuggestionKey(
  havenWikiPageId: string,
  transitionKey: string,
): string {
  return `haven-upkeep:${havenWikiPageId}:${transitionKey}`;
}

export function formatSuggestionAmountLabel(input: {
  entryKind: LedgerEntryKind;
  amount: number | null;
  suffix: string;
}): string | null {
  if (input.amount == null) return null;
  return formatLedgerAmountLabel({
    entryKind: input.entryKind,
    amount: input.amount,
    suffix: input.suffix,
  });
}

/** Optional structured quest reward for ledger suggestions. */
export type QuestLedgerReward = {
  amount: number;
  recipient: 'party' | 'individual';
  contributorPageId?: string | null;
};

export function parseQuestLedgerReward(raw: unknown): QuestLedgerReward | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const amount = normalizeLedgerAmount(record.amount);
  if (amount == null) return null;
  const recipientRaw = record.recipient;
  const recipient =
    recipientRaw === 'individual' || recipientRaw === 'party' ? recipientRaw : 'party';
  const contributorPageId =
    typeof record.contributorPageId === 'string' && record.contributorPageId.trim()
      ? record.contributorPageId.trim()
      : null;
  return { amount, recipient, contributorPageId };
}
