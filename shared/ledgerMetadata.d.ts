/**
 * Layer 1 — campaign economic ledger contracts.
 * Distinct from Investigation dependency ledger and dashboard quest/thread ledgers.
 * @see docs/architecture-internal/downtime-ledger.md
 */
export declare const CAMPAIGN_LEDGER_SEMANTICS_VERSION = "campaign-ledger-v1";
export declare const LEDGER_ENTRY_KINDS: readonly ["credit", "debit", "debt_open", "debt_payment"];
export type LedgerEntryKind = (typeof LEDGER_ENTRY_KINDS)[number];
export declare const LEDGER_CATEGORIES: readonly ["upkeep", "project", "income", "reward", "trade", "donation", "debt", "other"];
export type LedgerCategory = (typeof LEDGER_CATEGORIES)[number];
export declare const LEDGER_ENTRY_SOURCES: readonly ["manual", "system"];
export type LedgerEntrySource = (typeof LEDGER_ENTRY_SOURCES)[number];
export declare const LEDGER_DEBT_STATUSES: readonly ["open", "settled"];
export type LedgerDebtStatus = (typeof LEDGER_DEBT_STATUSES)[number];
export type LedgerDebtMeta = {
    status: LedgerDebtStatus;
    settledAtEpochMinute?: string | null;
};
export declare const DEFAULT_CURRENCY_LABEL = "gold";
export declare const DEFAULT_CURRENCY_SUFFIX = "g";
export declare const LEDGER_NARRATIVE_MAX_LENGTH = 120;
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
export declare function formatLedgerCategoryLabel(category: LedgerCategory): string;
export declare function normalizeLedgerEntryKind(raw: unknown): LedgerEntryKind | null;
export declare function normalizeLedgerCategory(raw: unknown): LedgerCategory;
export declare function normalizeLedgerNarrative(raw: unknown): string | null;
export declare function normalizeLedgerAmount(raw: unknown): number | null;
export declare function parseLedgerDebtMeta(raw: unknown): LedgerDebtMeta | null;
export declare function defaultDebtMetaForKind(kind: LedgerEntryKind): LedgerDebtMeta | null;
export declare function formatLedgerAmountLabel(input: {
    entryKind: LedgerEntryKind;
    amount: number;
    suffix: string;
}): string;
export declare function formatLedgerBalanceLabel(balance: number, suffix: string): string;
export declare function entryAffectsTreasury(entryKind: LedgerEntryKind): boolean;
export declare function treasuryDeltaForEntry(input: {
    entryKind: LedgerEntryKind;
    amount: number;
}): number;
export type LedgerBalanceEntry = Pick<CampaignLedgerEntryCore, 'entryKind' | 'amount' | 'debtMeta'>;
export declare function computeLedgerBalance(ledger: Pick<CampaignLedgerSettings, 'openingBalance'>, entries: LedgerBalanceEntry[]): number;
export declare function summarizeOpenDebts(entries: Array<Pick<CampaignLedgerEntryCore, 'id' | 'title' | 'amount' | 'narrative' | 'entryKind' | 'debtMeta'>>): LedgerDebtSummary[];
export declare function formatOpenDebtsSummary(debts: LedgerDebtSummary[], suffix: string): string | null;
export declare function ledgerEntryTone(entryKind: LedgerEntryKind, category: LedgerCategory): 'neutral' | 'warning' | 'escalation';
export declare const LEDGER_SUGGESTION_STATUSES: readonly ["pending", "accepted", "dismissed"];
export type LedgerSuggestionStatus = (typeof LEDGER_SUGGESTION_STATUSES)[number];
export declare const LEDGER_SUGGESTION_SOURCE_TYPES: readonly ["project_completion", "haven_upkeep", "trade_event", "quest_reward", "other"];
export type LedgerSuggestionSourceType = (typeof LEDGER_SUGGESTION_SOURCE_TYPES)[number];
export declare const LEDGER_SUGGESTION_CONFIDENCE_LEVELS: readonly ["inferred", "authored"];
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
export declare function normalizeLedgerSuggestionStatus(raw: unknown): LedgerSuggestionStatus;
export declare function normalizeLedgerSuggestionSourceType(raw: unknown): LedgerSuggestionSourceType;
export declare function normalizeLedgerSuggestionConfidence(raw: unknown): LedgerSuggestionConfidence;
export declare function normalizeOptionalLedgerAmount(raw: unknown): number | null;
export declare function buildProjectCompletionSuggestionKey(projectId: string, runId: string): string;
export declare function buildTradeEventSuggestionKey(effectId: string): string;
export declare function buildQuestRewardSuggestionKey(questPageId: string, transitionId: string): string;
export declare function buildHavenUpkeepSuggestionKey(havenWikiPageId: string, transitionKey: string): string;
export declare function formatSuggestionAmountLabel(input: {
    entryKind: LedgerEntryKind;
    amount: number | null;
    suffix: string;
}): string | null;
/** Optional structured quest reward for ledger suggestions. */
export type QuestLedgerReward = {
    amount: number;
    recipient: 'party' | 'individual';
    contributorPageId?: string | null;
};
export declare function parseQuestLedgerReward(raw: unknown): QuestLedgerReward | null;
//# sourceMappingURL=ledgerMetadata.d.ts.map