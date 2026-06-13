"use strict";
/**
 * Layer 1 — campaign economic ledger contracts.
 * Distinct from Investigation dependency ledger and dashboard quest/thread ledgers.
 * @see docs/platform/downtime-ledger.md
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEDGER_SUGGESTION_CONFIDENCE_LEVELS = exports.LEDGER_SUGGESTION_SOURCE_TYPES = exports.LEDGER_SUGGESTION_STATUSES = exports.LEDGER_NARRATIVE_MAX_LENGTH = exports.DEFAULT_CURRENCY_SUFFIX = exports.DEFAULT_CURRENCY_LABEL = exports.LEDGER_DEBT_STATUSES = exports.LEDGER_ENTRY_SOURCES = exports.LEDGER_CATEGORIES = exports.LEDGER_ENTRY_KINDS = exports.CAMPAIGN_LEDGER_SEMANTICS_VERSION = void 0;
exports.formatLedgerCategoryLabel = formatLedgerCategoryLabel;
exports.normalizeLedgerEntryKind = normalizeLedgerEntryKind;
exports.normalizeLedgerCategory = normalizeLedgerCategory;
exports.normalizeLedgerNarrative = normalizeLedgerNarrative;
exports.normalizeLedgerAmount = normalizeLedgerAmount;
exports.parseLedgerDebtMeta = parseLedgerDebtMeta;
exports.defaultDebtMetaForKind = defaultDebtMetaForKind;
exports.formatLedgerAmountLabel = formatLedgerAmountLabel;
exports.formatLedgerBalanceLabel = formatLedgerBalanceLabel;
exports.entryAffectsTreasury = entryAffectsTreasury;
exports.treasuryDeltaForEntry = treasuryDeltaForEntry;
exports.computeLedgerBalance = computeLedgerBalance;
exports.summarizeOpenDebts = summarizeOpenDebts;
exports.formatOpenDebtsSummary = formatOpenDebtsSummary;
exports.ledgerEntryTone = ledgerEntryTone;
exports.normalizeLedgerSuggestionStatus = normalizeLedgerSuggestionStatus;
exports.normalizeLedgerSuggestionSourceType = normalizeLedgerSuggestionSourceType;
exports.normalizeLedgerSuggestionConfidence = normalizeLedgerSuggestionConfidence;
exports.normalizeOptionalLedgerAmount = normalizeOptionalLedgerAmount;
exports.buildProjectCompletionSuggestionKey = buildProjectCompletionSuggestionKey;
exports.buildTradeEventSuggestionKey = buildTradeEventSuggestionKey;
exports.buildQuestRewardSuggestionKey = buildQuestRewardSuggestionKey;
exports.buildHavenUpkeepSuggestionKey = buildHavenUpkeepSuggestionKey;
exports.formatSuggestionAmountLabel = formatSuggestionAmountLabel;
exports.parseQuestLedgerReward = parseQuestLedgerReward;
exports.CAMPAIGN_LEDGER_SEMANTICS_VERSION = 'campaign-ledger-v1';
exports.LEDGER_ENTRY_KINDS = [
    'credit',
    'debit',
    'debt_open',
    'debt_payment',
];
exports.LEDGER_CATEGORIES = [
    'upkeep',
    'project',
    'income',
    'reward',
    'trade',
    'donation',
    'debt',
    'other',
];
exports.LEDGER_ENTRY_SOURCES = ['manual', 'system'];
exports.LEDGER_DEBT_STATUSES = ['open', 'settled'];
exports.DEFAULT_CURRENCY_LABEL = 'gold';
exports.DEFAULT_CURRENCY_SUFFIX = 'g';
exports.LEDGER_NARRATIVE_MAX_LENGTH = 120;
const CATEGORY_LABELS = {
    upkeep: 'Upkeep',
    project: 'Project',
    income: 'Income',
    reward: 'Reward',
    trade: 'Trade',
    donation: 'Donation',
    debt: 'Debt',
    other: 'Other',
};
function formatLedgerCategoryLabel(category) {
    return CATEGORY_LABELS[category] ?? 'Other';
}
function normalizeLedgerEntryKind(raw) {
    if (typeof raw !== 'string')
        return null;
    const lower = raw.trim().toLowerCase();
    return exports.LEDGER_ENTRY_KINDS.find((kind) => kind === lower) ?? null;
}
function normalizeLedgerCategory(raw) {
    if (typeof raw !== 'string')
        return 'other';
    const lower = raw.trim().toLowerCase();
    return exports.LEDGER_CATEGORIES.find((category) => category === lower) ?? 'other';
}
function normalizeLedgerNarrative(raw) {
    if (typeof raw !== 'string')
        return null;
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
    return trimmed.slice(0, exports.LEDGER_NARRATIVE_MAX_LENGTH);
}
function normalizeLedgerAmount(raw) {
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
function parseLedgerDebtMeta(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const record = raw;
    const statusRaw = record.status;
    const status = typeof statusRaw === 'string' &&
        exports.LEDGER_DEBT_STATUSES.includes(statusRaw)
        ? statusRaw
        : null;
    if (!status)
        return null;
    const settledAtEpochMinute = typeof record.settledAtEpochMinute === 'string'
        ? record.settledAtEpochMinute
        : null;
    return { status, settledAtEpochMinute };
}
function defaultDebtMetaForKind(kind) {
    if (kind === 'debt_open')
        return { status: 'open' };
    return null;
}
function formatLedgerAmountLabel(input) {
    const suffix = input.suffix.trim() || exports.DEFAULT_CURRENCY_SUFFIX;
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
function formatLedgerBalanceLabel(balance, suffix) {
    const normalizedSuffix = suffix.trim() || exports.DEFAULT_CURRENCY_SUFFIX;
    return `${balance.toLocaleString('en-US')}${normalizedSuffix}`;
}
function entryAffectsTreasury(entryKind) {
    return entryKind === 'credit' || entryKind === 'debit' || entryKind === 'debt_payment';
}
function treasuryDeltaForEntry(input) {
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
function computeLedgerBalance(ledger, entries) {
    let balance = ledger.openingBalance;
    for (const entry of entries) {
        balance += treasuryDeltaForEntry({
            entryKind: entry.entryKind,
            amount: entry.amount,
        });
    }
    return balance;
}
function summarizeOpenDebts(entries) {
    return entries
        .filter((entry) => entry.entryKind === 'debt_open' &&
        (entry.debtMeta?.status ?? 'open') === 'open')
        .map((entry) => ({
        entryId: entry.id,
        title: entry.title,
        amount: entry.amount,
        narrative: entry.narrative,
    }));
}
function formatOpenDebtsSummary(debts, suffix) {
    if (debts.length === 0)
        return null;
    const normalizedSuffix = suffix.trim() || exports.DEFAULT_CURRENCY_SUFFIX;
    if (debts.length === 1) {
        const debt = debts[0];
        return `${debt.amount.toLocaleString('en-US')}${normalizedSuffix} outstanding — ${debt.title}`;
    }
    const total = debts.reduce((sum, debt) => sum + debt.amount, 0);
    return `${debts.length} open debts · ${total.toLocaleString('en-US')}${normalizedSuffix} outstanding`;
}
function ledgerEntryTone(entryKind, category) {
    if (entryKind === 'debt_open')
        return 'escalation';
    if (entryKind === 'debit' && (category === 'upkeep' || category === 'project')) {
        return 'warning';
    }
    if (entryKind === 'credit')
        return 'neutral';
    return 'neutral';
}
// --- Treasury suggestions (Phase 4 — human-approved only) ---
exports.LEDGER_SUGGESTION_STATUSES = ['pending', 'accepted', 'dismissed'];
exports.LEDGER_SUGGESTION_SOURCE_TYPES = [
    'project_completion',
    'haven_upkeep',
    'trade_event',
    'quest_reward',
    'other',
];
exports.LEDGER_SUGGESTION_CONFIDENCE_LEVELS = ['inferred', 'authored'];
function normalizeLedgerSuggestionStatus(raw) {
    if (typeof raw !== 'string')
        return 'pending';
    const lower = raw.trim().toLowerCase();
    return exports.LEDGER_SUGGESTION_STATUSES.find((status) => status === lower) ?? 'pending';
}
function normalizeLedgerSuggestionSourceType(raw) {
    if (typeof raw !== 'string')
        return 'other';
    const lower = raw.trim().toLowerCase();
    return exports.LEDGER_SUGGESTION_SOURCE_TYPES.find((type) => type === lower) ?? 'other';
}
function normalizeLedgerSuggestionConfidence(raw) {
    if (typeof raw !== 'string')
        return 'inferred';
    const lower = raw.trim().toLowerCase();
    return exports.LEDGER_SUGGESTION_CONFIDENCE_LEVELS.find((level) => level === lower) ?? 'inferred';
}
function normalizeOptionalLedgerAmount(raw) {
    if (raw == null)
        return null;
    return normalizeLedgerAmount(raw);
}
function buildProjectCompletionSuggestionKey(projectId, runId) {
    return `project-completion:${projectId}:${runId}`;
}
function buildTradeEventSuggestionKey(effectId) {
    return `trade-event:${effectId}`;
}
function buildQuestRewardSuggestionKey(questPageId, transitionId) {
    return `quest-reward:${questPageId}:${transitionId}`;
}
function buildHavenUpkeepSuggestionKey(havenWikiPageId, transitionKey) {
    return `haven-upkeep:${havenWikiPageId}:${transitionKey}`;
}
function formatSuggestionAmountLabel(input) {
    if (input.amount == null)
        return null;
    return formatLedgerAmountLabel({
        entryKind: input.entryKind,
        amount: input.amount,
        suffix: input.suffix,
    });
}
function parseQuestLedgerReward(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const record = raw;
    const amount = normalizeLedgerAmount(record.amount);
    if (amount == null)
        return null;
    const recipientRaw = record.recipient;
    const recipient = recipientRaw === 'individual' || recipientRaw === 'party' ? recipientRaw : 'party';
    const contributorPageId = typeof record.contributorPageId === 'string' && record.contributorPageId.trim()
        ? record.contributorPageId.trim()
        : null;
    return { amount, recipient, contributorPageId };
}
//# sourceMappingURL=ledgerMetadata.js.map