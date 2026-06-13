import type { CampaignLedgerSuggestion, DowntimeProject, Prisma, WikiPage } from '@prisma/client';
import type { CampaignMemberRole } from '../types/domain.js';
import { prisma } from './prisma.js';
import { toNullableInputJsonValue } from './inputJsonValue.js';
import { ensureCampaignLedger, canManageLedgerSettings, type CreateLedgerEntryInput } from './campaignLedgerService.js';
import { buildWikiPageHref } from './wikiLinkService.js';
import { wikiPageHrefSelect } from './wikiPageHrefSelect.js';
import {
  defaultDebtMetaForKind,
  formatLedgerCategoryLabel,
  formatSuggestionAmountLabel,
  normalizeLedgerAmount,
  normalizeLedgerCategory,
  normalizeLedgerEntryKind,
  normalizeLedgerNarrative,
  normalizeLedgerSuggestionConfidence,
  normalizeLedgerSuggestionSourceType,
  normalizeLedgerSuggestionStatus,
  type CampaignLedgerSuggestionDetail,
  type EmitLedgerSuggestionInput,
  type LedgerEntryKind,
} from './ledgerMetadata.js';

type SuggestionRow = CampaignLedgerSuggestion & {
  project: (DowntimeProject & { wikiPage: Pick<WikiPage, 'id' | 'title'> }) | null;
  havenWiki: Pick<WikiPage, 'id' | 'title'> | null;
};

const suggestionInclude = {
  project: {
    include: {
      wikiPage: { select: { ...wikiPageHrefSelect } },
    },
  },
  havenWiki: { select: { ...wikiPageHrefSelect } },
} as const;

function rowToSuggestionDetail(
  row: SuggestionRow,
  campaignHandle: string,
  currencySuffix: string,
  canResolve: boolean,
): CampaignLedgerSuggestionDetail {
  const entryKind = normalizeLedgerEntryKind(row.entryKind) ?? 'debit';
  const category = normalizeLedgerCategory(row.category);
  const projectHref = row.project
    ? buildWikiPageHref(campaignHandle, row.project.wikiPage)
    : null;
  const havenHref = row.havenWiki
    ? buildWikiPageHref(campaignHandle, row.havenWiki)
    : null;

  return {
    id: row.id,
    status: normalizeLedgerSuggestionStatus(row.status),
    entryKind,
    category,
    title: row.title,
    narrative: row.narrative,
    amount: row.amount,
    occurredAtEpochMinute: row.occurredAtEpochMinute.toString(),
    sourceType: normalizeLedgerSuggestionSourceType(row.sourceType),
    sourceRef: row.sourceRef,
    projectId: row.projectId,
    havenWikiPageId: row.havenWikiPageId,
    confidence: normalizeLedgerSuggestionConfidence(row.confidence),
    acceptedEntryId: row.acceptedEntryId,
    resolvedByUserId: row.resolvedByUserId,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    amountLabel: formatSuggestionAmountLabel({
      entryKind,
      amount: row.amount,
      suffix: currencySuffix,
    }),
    categoryLabel: formatLedgerCategoryLabel(category),
    projectTitle: row.project?.wikiPage.title ?? null,
    havenTitle: row.havenWiki?.title ?? null,
    projectHref,
    havenHref,
    canResolve,
  };
}

export async function emitLedgerSuggestion(
  tx: Prisma.TransactionClient,
  input: EmitLedgerSuggestionInput,
): Promise<{ created: boolean; suggestionId: string | null }> {
  const entryKind = normalizeLedgerEntryKind(input.entryKind);
  if (!entryKind) {
    return { created: false, suggestionId: null };
  }

  const existing = await tx.campaignLedgerSuggestion.findUnique({
    where: {
      campaignId_idempotencyKey: {
        campaignId: input.campaignId,
        idempotencyKey: input.idempotencyKey,
      },
    },
    select: { id: true },
  });
  if (existing) {
    return { created: false, suggestionId: existing.id };
  }

  const ledger = await ensureCampaignLedger(input.campaignId, undefined, tx);
  const amount =
    input.amount != null ? normalizeLedgerAmount(input.amount) : null;

  const row = await tx.campaignLedgerSuggestion.create({
    data: {
      campaignId: input.campaignId,
      ledgerId: ledger.id,
      status: 'pending',
      entryKind,
      category: normalizeLedgerCategory(input.category),
      title: input.title.trim(),
      narrative: normalizeLedgerNarrative(input.narrative),
      amount,
      occurredAtEpochMinute: BigInt(String(input.occurredAtEpochMinute)),
      sourceType: input.sourceType,
      sourceRef: input.sourceRef,
      idempotencyKey: input.idempotencyKey,
      projectId: input.projectId ?? null,
      havenWikiPageId: input.havenWikiPageId ?? null,
      confidence: input.confidence ?? 'inferred',
    },
  });

  return { created: true, suggestionId: row.id };
}

export async function listPendingLedgerSuggestions(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
  options?: { limit?: number },
): Promise<CampaignLedgerSuggestionDetail[]> {
  const limit = options?.limit ?? 50;
  const ledger = await ensureCampaignLedger(campaignId);
  const canResolve = canManageLedgerSettings(role);

  const rows = await prisma.campaignLedgerSuggestion.findMany({
    where: { campaignId, status: 'pending' },
    include: suggestionInclude,
    orderBy: [{ occurredAtEpochMinute: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  return rows.map((row) =>
    rowToSuggestionDetail(row, campaignHandle, ledger.currencySuffix, canResolve),
  );
}

export async function countPendingLedgerSuggestions(campaignId: string): Promise<number> {
  return prisma.campaignLedgerSuggestion.count({
    where: { campaignId, status: 'pending' },
  });
}

export type AcceptLedgerSuggestionInput = {
  suggestionId: string;
  campaignId: string;
  campaignHandle: string;
  role: CampaignMemberRole | null;
  userId: string;
  edits?: Partial<CreateLedgerEntryInput> & {
    contributorPageId?: string | null;
  };
};

export async function acceptLedgerSuggestion(
  input: AcceptLedgerSuggestionInput,
): Promise<{ suggestion: CampaignLedgerSuggestionDetail; entryId: string }> {
  if (!canManageLedgerSettings(input.role)) {
    throw new Error('Forbidden');
  }

  const suggestion = await prisma.campaignLedgerSuggestion.findFirst({
    where: { id: input.suggestionId, campaignId: input.campaignId },
    include: suggestionInclude,
  });
  if (!suggestion) {
    throw new Error('Suggestion not found.');
  }
  if (suggestion.status !== 'pending') {
    throw new Error('Suggestion is no longer pending.');
  }

  const edits = input.edits ?? {};
  const entryKind =
    edits.entryKind != null
      ? normalizeLedgerEntryKind(edits.entryKind)
      : normalizeLedgerEntryKind(suggestion.entryKind);
  if (!entryKind) {
    throw new Error('Invalid entry kind.');
  }

  const rawAmount = edits.amount ?? suggestion.amount;
  const amount = normalizeLedgerAmount(rawAmount);
  if (amount == null) {
    throw new Error('Amount is required to accept this suggestion.');
  }

  const title =
    typeof edits.title === 'string' && edits.title.trim()
      ? edits.title.trim()
      : suggestion.title;

  const ledger = await ensureCampaignLedger(input.campaignId, input.userId);

  const result = await prisma.$transaction(async (tx) => {
    const entry = await tx.campaignLedgerEntry.create({
      data: {
        campaignId: input.campaignId,
        ledgerId: ledger.id,
        entryKind,
        category: normalizeLedgerCategory(edits.category ?? suggestion.category),
        title,
        narrative:
          edits.narrative !== undefined
            ? normalizeLedgerNarrative(edits.narrative)
            : suggestion.narrative,
        amount,
        occurredAtEpochMinute:
          edits.occurredAtEpochMinute != null
            ? BigInt(String(edits.occurredAtEpochMinute))
            : suggestion.occurredAtEpochMinute,
        projectId:
          edits.projectId !== undefined ? edits.projectId : suggestion.projectId,
        havenWikiPageId:
          edits.havenWikiPageId !== undefined
            ? edits.havenWikiPageId
            : suggestion.havenWikiPageId,
        contributorPageId: edits.contributorPageId ?? null,
        debtMeta: toNullableInputJsonValue(defaultDebtMetaForKind(entryKind)),
        source: 'manual',
        createdByUserId: input.userId,
        updatedByUserId: input.userId,
      },
    });

    const updated = await tx.campaignLedgerSuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: 'accepted',
        acceptedEntryId: entry.id,
        resolvedByUserId: input.userId,
        resolvedAt: new Date(),
      },
      include: suggestionInclude,
    });

    return { updated, entryId: entry.id };
  });

  return {
    suggestion: rowToSuggestionDetail(
      result.updated,
      input.campaignHandle,
      ledger.currencySuffix,
      false,
    ),
    entryId: result.entryId,
  };
}

export async function dismissLedgerSuggestion(
  campaignId: string,
  campaignHandle: string,
  role: CampaignMemberRole | null,
  userId: string,
  suggestionId: string,
): Promise<CampaignLedgerSuggestionDetail> {
  if (!canManageLedgerSettings(role)) {
    throw new Error('Forbidden');
  }

  const suggestion = await prisma.campaignLedgerSuggestion.findFirst({
    where: { id: suggestionId, campaignId },
    include: suggestionInclude,
  });
  if (!suggestion) {
    throw new Error('Suggestion not found.');
  }
  if (suggestion.status !== 'pending') {
    throw new Error('Suggestion is no longer pending.');
  }

  const ledger = await ensureCampaignLedger(campaignId);
  const updated = await prisma.campaignLedgerSuggestion.update({
    where: { id: suggestionId },
    data: {
      status: 'dismissed',
      resolvedByUserId: userId,
      resolvedAt: new Date(),
    },
    include: suggestionInclude,
  });

  return rowToSuggestionDetail(updated, campaignHandle, ledger.currencySuffix, false);
}

export function mapEntryKindFromImpactKind(
  kind: 'credit' | 'debit',
): LedgerEntryKind {
  return kind === 'credit' ? 'credit' : 'debit';
}
