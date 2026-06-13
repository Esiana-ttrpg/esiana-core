import type { CampaignLedger, CampaignLedgerEntry, DowntimeProject, FantasyCalendar, Prisma, WikiPage } from '@prisma/client';
import type { CampaignMemberRole } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';
import { prisma } from './prisma.js';
import { assertScopedMutationCount } from './scopedMutation.js';
import { toNullableInputJsonValue } from './inputJsonValue.js';
import { logCampaignActivity } from './campaignActivity.js';
import { buildCalendarStates } from './timeTracking.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import { wikiPageHrefSelect } from './wikiPageHrefSelect.js';
import {
  CAMPAIGN_LEDGER_SEMANTICS_VERSION,
  DEFAULT_CURRENCY_LABEL,
  DEFAULT_CURRENCY_SUFFIX,
  computeLedgerBalance,
  defaultDebtMetaForKind,
  formatLedgerAmountLabel,
  formatLedgerBalanceLabel,
  formatLedgerCategoryLabel,
  formatOpenDebtsSummary,
  ledgerEntryTone,
  normalizeLedgerAmount,
  normalizeLedgerCategory,
  normalizeLedgerEntryKind,
  normalizeLedgerNarrative,
  parseLedgerDebtMeta,
  summarizeOpenDebts,
  type CampaignLedgerDetail,
  type CampaignLedgerEntryDetail,
  type LedgerDebtMeta,
  type LedgerEntryKind,
} from './ledgerMetadata.js';
import {
  DOWNTIME_PLACEHOLDER_FRAMING,
  type DowntimeHubLedgerPayload,
  type LedgerSuggestionLine,
  type LedgerTransactionLine,
} from '../../../shared/downtimeHub.js';
import { countPendingLedgerSuggestions, listPendingLedgerSuggestions } from './ledgerSuggestionService.js';
import { listScheduledEffects } from './scheduledEffectService.js';

/** SQLite rejects omitted/undefined nullable JSON; always pass null or a JSON value. */
function debtMetaForDb(
  debtMeta: LedgerDebtMeta | null,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  return toNullableInputJsonValue(debtMeta);
}

type LedgerEntryRow = CampaignLedgerEntry & {
  project: (DowntimeProject & { wikiPage: Pick<WikiPage, 'id' | 'title'> }) | null;
  havenWiki: Pick<WikiPage, 'id' | 'title'> | null;
  contributorWiki: Pick<WikiPage, 'id' | 'title'> | null;
};

export type CreateLedgerEntryInput = {
  entryKind: LedgerEntryKind;
  category?: string;
  title: string;
  narrative?: string | null;
  amount: number;
  occurredAtEpochMinute?: string | bigint;
  projectId?: string | null;
  havenWikiPageId?: string | null;
  contributorPageId?: string | null;
  debtMeta?: LedgerDebtMeta | null;
};

export type UpdateLedgerEntryInput = Partial<CreateLedgerEntryInput> & {
  debtMeta?: LedgerDebtMeta | null;
};

export type UpdateLedgerSettingsInput = {
  currencyLabel?: string;
  currencySuffix?: string;
  openingBalance?: number;
  sharedTreasuryEnabled?: boolean;
};

const entryInclude = {
  project: {
    include: {
      wikiPage: { select: { ...wikiPageHrefSelect } },
    },
  },
  havenWiki: { select: { ...wikiPageHrefSelect } },
  contributorWiki: { select: { ...wikiPageHrefSelect } },
} as const;

export function canContributeToLedger(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER ||
    role === CampaignMemberRoles.WRITER ||
    role === CampaignMemberRoles.PARTICIPANT
  );
}

export function canManageLedgerSettings(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER ||
    role === CampaignMemberRoles.WRITER
  );
}

export function canEditLedgerEntry(
  role: CampaignMemberRole | null,
  userId: string | null,
  entry: Pick<CampaignLedgerEntry, 'createdByUserId'>,
): boolean {
  if (canManageLedgerSettings(role)) return true;
  if (role !== CampaignMemberRoles.PARTICIPANT) return false;
  return Boolean(userId && entry.createdByUserId && entry.createdByUserId === userId);
}

function formatEpochMinuteLabel(
  epochMinute: bigint,
  masterCalendar: FantasyCalendar | null,
): string {
  if (!masterCalendar) {
    return `Minute ${epochMinute.toString()}`;
  }
  const [built] = buildCalendarStates(epochMinute, [masterCalendar]);
  const state = built?.state;
  if (!state) {
    return `Minute ${epochMinute.toString()}`;
  }
  return `${state.day} ${state.monthName}, Year ${state.year}`;
}

async function loadMasterCalendar(campaignId: string): Promise<FantasyCalendar | null> {
  const calendars = await prisma.fantasyCalendar.findMany({
    where: { campaignId },
    orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }],
  });
  return calendars.find((calendar) => calendar.isMasterTime) ?? calendars[0] ?? null;
}

function rowToEntryDetail(
  row: LedgerEntryRow,
  campaignHandle: string,
  masterCalendar: FantasyCalendar | null,
): CampaignLedgerEntryDetail {
  const entryKind = normalizeLedgerEntryKind(row.entryKind) ?? 'debit';
  const category = normalizeLedgerCategory(row.category);
  const projectHref = row.project
    ? buildWikiPageHref(campaignHandle, row.project.wikiPage)
    : null;
  const havenHref = row.havenWiki
    ? buildWikiPageHref(campaignHandle, row.havenWiki)
    : null;
  const contributorHref = row.contributorWiki
    ? buildWikiPageHref(campaignHandle, row.contributorWiki)
    : null;

  return {
    id: row.id,
    entryKind,
    category,
    title: row.title,
    narrative: row.narrative,
    amount: row.amount,
    occurredAtEpochMinute: row.occurredAtEpochMinute.toString(),
    projectId: row.projectId,
    havenWikiPageId: row.havenWikiPageId,
    debtMeta: parseLedgerDebtMeta(row.debtMeta),
    source: row.source === 'system' ? 'system' : 'manual',
    contributorPageId: row.contributorPageId,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    projectTitle: row.project?.wikiPage.title ?? null,
    havenTitle: row.havenWiki?.title ?? null,
    contributorTitle: row.contributorWiki?.title ?? null,
    projectHref,
    havenHref,
    contributorHref,
  };
}

function entryToFeedLine(
  entry: CampaignLedgerEntryDetail,
  suffix: string,
  role: CampaignMemberRole | null,
  userId: string | null,
  masterCalendar: FantasyCalendar | null,
): LedgerTransactionLine {
  const href = entry.projectHref ?? entry.havenHref ?? entry.contributorHref ?? undefined;
  const displayTitle = entry.contributorTitle
    ? `${entry.contributorTitle} — ${entry.title}`
    : entry.title;
  return {
    id: entry.id,
    title: displayTitle,
    amountLabel: formatLedgerAmountLabel({
      entryKind: entry.entryKind,
      amount: entry.amount,
      suffix,
    }),
    narrative: entry.narrative,
    dateLabel: formatEpochMinuteLabel(BigInt(entry.occurredAtEpochMinute), masterCalendar),
    category: entry.category,
    categoryLabel: formatLedgerCategoryLabel(entry.category),
    tone: ledgerEntryTone(entry.entryKind, entry.category),
    href,
    entryKind: entry.entryKind,
    amount: entry.amount,
    projectId: entry.projectId,
    havenWikiPageId: entry.havenWikiPageId,
    contributorPageId: entry.contributorPageId,
    contributorTitle: entry.contributorTitle,
    canEdit: canEditLedgerEntry(role, userId, {
      createdByUserId: entry.createdByUserId,
    }),
    canDelete: canEditLedgerEntry(role, userId, {
      createdByUserId: entry.createdByUserId,
    }),
  };
}

export async function ensureCampaignLedger(
  campaignId: string,
  userId?: string | null,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<CampaignLedger> {
  const existing = await db.campaignLedger.findUnique({
    where: { campaignId },
  });
  if (existing) return existing;

  return db.campaignLedger.create({
    data: {
      campaignId,
      semanticsVersion: CAMPAIGN_LEDGER_SEMANTICS_VERSION,
      updatedByUserId: userId ?? null,
    },
  });
}

export async function listLedgerEntries(
  campaignId: string,
  options?: { limit?: number },
): Promise<LedgerEntryRow[]> {
  const limit = options?.limit ?? 100;
  return prisma.campaignLedgerEntry.findMany({
    where: { campaignId },
    include: entryInclude,
    orderBy: [{ occurredAtEpochMinute: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });
}

export async function getCampaignLedgerDetail(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
  userId: string | null,
): Promise<CampaignLedgerDetail> {
  const ledger = await ensureCampaignLedger(campaignId);
  const [entries, masterCalendar] = await Promise.all([
    listLedgerEntries(campaignId),
    loadMasterCalendar(campaignId),
  ]);

  const entryDetails = entries.map((row) =>
    rowToEntryDetail(row, campaignHandle, masterCalendar),
  );

  const balance = computeLedgerBalance(ledger, entryDetails);
  const openDebts = summarizeOpenDebts(entryDetails);

  return {
    id: ledger.id,
    campaignId: ledger.campaignId,
    currencyLabel: ledger.currencyLabel,
    currencySuffix: ledger.currencySuffix,
    openingBalance: ledger.openingBalance,
    sharedTreasuryEnabled: ledger.sharedTreasuryEnabled,
    semanticsVersion: ledger.semanticsVersion,
    balance,
    openDebts,
  };
}

export async function buildLedgerHubPayload(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
  userId: string | null,
): Promise<DowntimeHubLedgerPayload> {
  const ledger = await ensureCampaignLedger(campaignId);
  const [entries, masterCalendar, pendingSuggestions, pendingSuggestionsCount, scheduledEffects] =
    await Promise.all([
      listLedgerEntries(campaignId, { limit: 50 }),
      loadMasterCalendar(campaignId),
      listPendingLedgerSuggestions(campaignId, campaignHandle, role, { limit: 10 }),
      countPendingLedgerSuggestions(campaignId),
      listScheduledEffects(campaignId, campaignHandle, role, { scope: 'treasury' }),
    ]);

  const entryDetails = entries.map((row) =>
    rowToEntryDetail(row, campaignHandle, masterCalendar),
  );
  const balance = computeLedgerBalance(ledger, entryDetails);
  const openDebts = summarizeOpenDebts(entryDetails);

  return {
    treasury: {
      balance,
      balanceLabel: formatLedgerBalanceLabel(balance, ledger.currencySuffix),
      currencyLabel: ledger.currencyLabel,
      currencySuffix: ledger.currencySuffix,
      openingBalance: ledger.openingBalance,
      sharedTreasuryEnabled: ledger.sharedTreasuryEnabled,
      openDebtsSummary: formatOpenDebtsSummary(openDebts, ledger.currencySuffix),
    },
    feed: entryDetails.map((entry) =>
      entryToFeedLine(entry, ledger.currencySuffix, role, userId, masterCalendar),
    ),
    pendingSuggestions: pendingSuggestions.map(
      (suggestion): LedgerSuggestionLine => ({
        id: suggestion.id,
        title: suggestion.title,
        amountLabel: suggestion.amountLabel,
        narrative: suggestion.narrative,
        category: suggestion.category,
        categoryLabel: suggestion.categoryLabel,
        entryKind: suggestion.entryKind,
        amount: suggestion.amount,
        confidence: suggestion.confidence,
        sourceType: suggestion.sourceType,
        projectId: suggestion.projectId,
        havenWikiPageId: suggestion.havenWikiPageId,
        projectHref: suggestion.projectHref,
        havenHref: suggestion.havenHref,
        canResolve: suggestion.canResolve,
      }),
    ),
    pendingSuggestionsCount,
    scheduledTreasury: scheduledEffects
      .filter(
        (schedule) =>
          schedule.status !== 'archived' &&
          (schedule.effectKind === 'ledger_upkeep' || schedule.effectKind === 'ledger_income'),
      )
      .map((schedule) => ({
        id: schedule.id,
        title: schedule.title,
        effectKind: schedule.effectKind as 'ledger_upkeep' | 'ledger_income',
        status: schedule.status,
        amount: schedule.amount,
        recurrenceLabel: schedule.recurrenceLabel,
        nextFireLabel: schedule.nextFireLabel,
        havenTitle: schedule.havenTitle,
        havenHref: schedule.havenHref,
        canManage: schedule.canManage,
      })),
    scheduledTreasuryActiveCount: scheduledEffects.filter(
      (schedule) => schedule.status === 'active',
    ).length,
    framing: DOWNTIME_PLACEHOLDER_FRAMING.ledger,
  };
}

async function resolveCurrentEpochMinute(campaignId: string): Promise<bigint> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { currentEpochMinute: true },
  });
  return campaign?.currentEpochMinute ?? 0n;
}

async function validateEntryLinks(
  campaignId: string,
  projectId: string | null | undefined,
  havenWikiPageId: string | null | undefined,
  contributorPageId?: string | null | undefined,
): Promise<void> {
  if (projectId) {
    const project = await prisma.downtimeProject.findFirst({
      where: { id: projectId, campaignId },
      select: { id: true },
    });
    if (!project) {
      throw new Error('Linked project not found in this campaign.');
    }
  }
  if (havenWikiPageId) {
    const haven = await prisma.downtimeHaven.findFirst({
      where: { campaignId, wikiPageId: havenWikiPageId },
      select: { id: true },
    });
    if (!haven) {
      throw new Error('Linked haven not found in this campaign.');
    }
  }
  if (contributorPageId) {
    const contributor = await prisma.wikiPage.findFirst({
      where: { id: contributorPageId, campaignId },
      select: { id: true },
    });
    if (!contributor) {
      throw new Error('Linked contributor character not found in this campaign.');
    }
  }
}

export async function createLedgerEntry(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
  userId: string,
  input: CreateLedgerEntryInput,
): Promise<CampaignLedgerEntryDetail> {
  if (!canContributeToLedger(role)) {
    throw new Error('Forbidden');
  }

  const entryKind = normalizeLedgerEntryKind(input.entryKind);
  if (!entryKind) {
    throw new Error('Invalid entry kind.');
  }

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title) {
    throw new Error('Title is required.');
  }

  const amount = normalizeLedgerAmount(input.amount);
  if (amount == null) {
    throw new Error('Amount must be a positive integer.');
  }

  await validateEntryLinks(
    campaignId,
    input.projectId,
    input.havenWikiPageId,
    input.contributorPageId,
  );

  const ledger = await ensureCampaignLedger(campaignId, userId);
  const occurredAtEpochMinute =
    input.occurredAtEpochMinute != null
      ? BigInt(String(input.occurredAtEpochMinute))
      : await resolveCurrentEpochMinute(campaignId);

  const debtMeta =
    input.debtMeta ?? defaultDebtMetaForKind(entryKind);

  const row = await prisma.campaignLedgerEntry.create({
    data: {
      campaignId,
      ledgerId: ledger.id,
      entryKind,
      category: normalizeLedgerCategory(input.category),
      title,
      narrative: normalizeLedgerNarrative(input.narrative),
      amount,
      occurredAtEpochMinute,
      projectId: input.projectId ?? null,
      havenWikiPageId: input.havenWikiPageId ?? null,
      contributorPageId: input.contributorPageId ?? null,
      debtMeta: debtMetaForDb(debtMeta ?? null),
      source: 'manual',
      createdByUserId: userId,
      updatedByUserId: userId,
    },
    include: entryInclude,
  });

  logCampaignActivity({
    campaignId,
    userId,
    actionType: 'CREATE',
    entityType: 'CAMPAIGN_LEDGER_ENTRY',
    entityId: row.id,
    entityName: row.title,
    parentContext: 'Ledger',
  });

  const masterCalendar = await loadMasterCalendar(campaignId);
  return rowToEntryDetail(row, campaignHandle, masterCalendar);
}

export async function updateLedgerEntry(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
  userId: string,
  entryId: string,
  patch: UpdateLedgerEntryInput,
): Promise<CampaignLedgerEntryDetail> {
  const existing = await prisma.campaignLedgerEntry.findFirst({
    where: { id: entryId, campaignId },
    include: entryInclude,
  });
  if (!existing) {
    throw new Error('Ledger entry not found.');
  }
  if (!canEditLedgerEntry(role, userId, existing)) {
    throw new Error('Forbidden');
  }

  const data: Record<string, unknown> = {
    updatedByUserId: userId,
  };

  if (patch.entryKind !== undefined) {
    const entryKind = normalizeLedgerEntryKind(patch.entryKind);
    if (!entryKind) throw new Error('Invalid entry kind.');
    data.entryKind = entryKind;
  }
  if (patch.category !== undefined) {
    data.category = normalizeLedgerCategory(patch.category);
  }
  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new Error('Title is required.');
    data.title = title;
  }
  if (patch.narrative !== undefined) {
    data.narrative = normalizeLedgerNarrative(patch.narrative);
  }
  if (patch.amount !== undefined) {
    const amount = normalizeLedgerAmount(patch.amount);
    if (amount == null) throw new Error('Amount must be a positive integer.');
    data.amount = amount;
  }
  if (patch.occurredAtEpochMinute !== undefined) {
    data.occurredAtEpochMinute = BigInt(String(patch.occurredAtEpochMinute));
  }
  if (patch.projectId !== undefined) {
    data.projectId = patch.projectId;
  }
  if (patch.havenWikiPageId !== undefined) {
    data.havenWikiPageId = patch.havenWikiPageId;
  }
  if (patch.contributorPageId !== undefined) {
    data.contributorPageId = patch.contributorPageId;
  }
  if (patch.debtMeta !== undefined) {
    data.debtMeta = debtMetaForDb(patch.debtMeta ?? null);
  }

  const nextProjectId =
    patch.projectId !== undefined ? patch.projectId : existing.projectId;
  const nextHavenId =
    patch.havenWikiPageId !== undefined
      ? patch.havenWikiPageId
      : existing.havenWikiPageId;
  const nextContributorId =
    patch.contributorPageId !== undefined
      ? patch.contributorPageId
      : existing.contributorPageId;
  await validateEntryLinks(
    campaignId,
    nextProjectId,
    nextHavenId,
    nextContributorId,
  );

  const updateResult = await prisma.campaignLedgerEntry.updateMany({
    where: { id: entryId, campaignId },
    data,
  });
  assertScopedMutationCount(updateResult.count, 1, 'Ledger entry not found.');

  const row = await prisma.campaignLedgerEntry.findFirst({
    where: { id: entryId, campaignId },
    include: entryInclude,
  });
  if (!row) {
    throw new Error('Ledger entry not found.');
  }

  logCampaignActivity({
    campaignId,
    userId,
    actionType: 'UPDATE',
    entityType: 'CAMPAIGN_LEDGER_ENTRY',
    entityId: row.id,
    entityName: row.title,
    parentContext: 'Ledger',
  });

  const masterCalendar = await loadMasterCalendar(campaignId);
  return rowToEntryDetail(row, campaignHandle, masterCalendar);
}

export async function deleteLedgerEntry(
  campaignId: string,
  role: CampaignMemberRole | null,
  userId: string,
  entryId: string,
): Promise<void> {
  const existing = await prisma.campaignLedgerEntry.findFirst({
    where: { id: entryId, campaignId },
    select: { id: true, title: true, createdByUserId: true },
  });
  if (!existing) {
    throw new Error('Ledger entry not found.');
  }
  if (!canEditLedgerEntry(role, userId, existing)) {
    throw new Error('Forbidden');
  }

  const deleteResult = await prisma.campaignLedgerEntry.deleteMany({
    where: { id: entryId, campaignId },
  });
  assertScopedMutationCount(deleteResult.count, 1, 'Ledger entry not found.');

  logCampaignActivity({
    campaignId,
    userId,
    actionType: 'DELETE',
    entityType: 'CAMPAIGN_LEDGER_ENTRY',
    entityId: existing.id,
    entityName: existing.title,
    parentContext: 'Ledger',
  });
}

export async function updateLedgerSettings(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
  userId: string,
  patch: UpdateLedgerSettingsInput,
): Promise<CampaignLedgerDetail> {
  if (!canManageLedgerSettings(role)) {
    throw new Error('Forbidden');
  }

  const ledger = await ensureCampaignLedger(campaignId, userId);
  const data: Record<string, unknown> = { updatedByUserId: userId };

  if (patch.currencyLabel !== undefined) {
    const label = patch.currencyLabel.trim();
    if (!label) throw new Error('Currency label is required.');
    data.currencyLabel = label.slice(0, 40);
  }
  if (patch.currencySuffix !== undefined) {
    const suffix = patch.currencySuffix.trim();
    if (!suffix) throw new Error('Currency suffix is required.');
    data.currencySuffix = suffix.slice(0, 8);
  }
  if (patch.openingBalance !== undefined) {
    if (!Number.isFinite(patch.openingBalance)) {
      throw new Error('Opening balance must be a number.');
    }
    data.openingBalance = Math.floor(patch.openingBalance);
  }
  if (patch.sharedTreasuryEnabled !== undefined) {
    data.sharedTreasuryEnabled = Boolean(patch.sharedTreasuryEnabled);
  }

  const ledgerUpdateResult = await prisma.campaignLedger.updateMany({
    where: { id: ledger.id, campaignId },
    data,
  });
  assertScopedMutationCount(ledgerUpdateResult.count, 1, 'Ledger not found.');

  return getCampaignLedgerDetail(campaignId, campaignHandle, role, userId);
}

export async function getLedgerEntry(
  campaignId: string,
  campaignHandle: string,
  entryId: string,
): Promise<CampaignLedgerEntryDetail | null> {
  const row = await prisma.campaignLedgerEntry.findFirst({
    where: { id: entryId, campaignId },
    include: entryInclude,
  });
  if (!row) return null;
  const masterCalendar = await loadMasterCalendar(campaignId);
  return rowToEntryDetail(row, campaignHandle, masterCalendar);
}
