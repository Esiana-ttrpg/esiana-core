import { apiFetch } from './api';
import type {
  CampaignLedgerDetail,
  CampaignLedgerEntryDetail,
  CampaignLedgerSuggestionDetail,
  LedgerCategory,
  LedgerEntryKind,
} from '@shared/ledgerMetadata';
import type { DowntimeProjectDetail } from '@shared/projectMetadata';
import type { LedgerSuggestionLine } from '@shared/downtimeHub';

export type CreateLedgerEntryInput = {
  entryKind: LedgerEntryKind;
  category?: LedgerCategory;
  title: string;
  amount: number;
  narrative?: string | null;
  occurredAtEpochMinute?: string;
  projectId?: string | null;
  havenWikiPageId?: string | null;
  contributorPageId?: string | null;
};

export type LedgerQuickActionPreset = 'contribute' | 'withdraw' | 'fund_project';

export type UpdateLedgerEntryInput = Partial<CreateLedgerEntryInput>;

export type PatchLedgerSettingsInput = {
  currencyLabel?: string;
  currencySuffix?: string;
  openingBalance?: number;
  sharedTreasuryEnabled?: boolean;
};

export async function listDowntimeProjects(
  campaignHandle: string,
): Promise<DowntimeProjectDetail[]> {
  const response = await apiFetch<{ projects: DowntimeProjectDetail[] }>(
    `/campaigns/${campaignHandle}/downtime/projects?includeTerminal=true`,
  );
  return response.projects;
}

export async function fetchCampaignLedger(
  campaignHandle: string,
): Promise<{ ledger: CampaignLedgerDetail }> {
  const response = await apiFetch<{
    ledger: CampaignLedgerDetail;
  }>(`/campaigns/${campaignHandle}/downtime/ledger`);
  return { ledger: response.ledger };
}

export async function fetchPendingLedgerSuggestions(
  campaignHandle: string,
): Promise<LedgerSuggestionLine[]> {
  const response = await apiFetch<{ suggestions: CampaignLedgerSuggestionDetail[] }>(
    `/campaigns/${campaignHandle}/downtime/ledger/suggestions`,
  );
  return response.suggestions.map((suggestion) => ({
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
  }));
}

export async function acceptLedgerSuggestion(
  campaignHandle: string,
  suggestionId: string,
  edits?: Partial<CreateLedgerEntryInput>,
): Promise<{ entryId: string }> {
  const response = await apiFetch<{ entryId: string }>(
    `/campaigns/${campaignHandle}/downtime/ledger/suggestions/${suggestionId}/accept`,
    {
      method: 'POST',
      body: JSON.stringify(edits ? { edits } : {}),
    },
  );
  return response;
}

export async function dismissLedgerSuggestion(
  campaignHandle: string,
  suggestionId: string,
): Promise<void> {
  await apiFetch<void>(
    `/campaigns/${campaignHandle}/downtime/ledger/suggestions/${suggestionId}/dismiss`,
    { method: 'POST' },
  );
}

export async function patchLedgerSettings(
  campaignHandle: string,
  patch: PatchLedgerSettingsInput,
): Promise<CampaignLedgerDetail> {
  const response = await apiFetch<{ ledger: CampaignLedgerDetail }>(
    `/campaigns/${campaignHandle}/downtime/ledger`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );
  return response.ledger;
}

export async function createLedgerEntry(
  campaignHandle: string,
  input: CreateLedgerEntryInput,
): Promise<CampaignLedgerEntryDetail> {
  const response = await apiFetch<{ entry: CampaignLedgerEntryDetail }>(
    `/campaigns/${campaignHandle}/downtime/ledger/entries`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return response.entry;
}

export async function updateLedgerEntry(
  campaignHandle: string,
  entryId: string,
  patch: UpdateLedgerEntryInput,
): Promise<CampaignLedgerEntryDetail> {
  const response = await apiFetch<{ entry: CampaignLedgerEntryDetail }>(
    `/campaigns/${campaignHandle}/downtime/ledger/entries/${entryId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );
  return response.entry;
}

export async function deleteLedgerEntry(
  campaignHandle: string,
  entryId: string,
): Promise<void> {
  await apiFetch<void>(`/campaigns/${campaignHandle}/downtime/ledger/entries/${entryId}`, {
    method: 'DELETE',
  });
}

export function presetForQuickAction(
  action: LedgerQuickActionPreset,
): Pick<CreateLedgerEntryInput, 'entryKind' | 'category' | 'title'> {
  switch (action) {
    case 'contribute':
      return { entryKind: 'credit', category: 'donation', title: 'Party contribution' };
    case 'withdraw':
      return { entryKind: 'debit', category: 'other', title: 'Party withdrawal' };
    case 'fund_project':
      return { entryKind: 'debit', category: 'project', title: 'Project funding' };
  }
}
