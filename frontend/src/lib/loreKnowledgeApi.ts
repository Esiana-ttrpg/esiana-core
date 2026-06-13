import { apiFetch } from './api';
import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import type {
  EntityHistoricalAliasRecord,
  InterpretiveLoreSummary,
  LoreInterpretationAccountRecord,
  LoreInterpretationGroupRecord,
  LoreClaimRecord,
  LoreClaimSourceRecord,
  ChronologyDateParts,
  EntityHistoricalNameProjection,
} from './loreKnowledgeProjection';

export type LoreClaimWithSources = LoreClaimRecord & {
  sources: LoreClaimSourceRecord[];
};

export type InterpretiveSummaryResponse = InterpretiveLoreSummary & {
  nameProjection: EntityHistoricalNameProjection;
};

export async function fetchHistoricalAliases(
  campaignHandle: string,
  pageId: string,
): Promise<{ aliases: EntityHistoricalAliasRecord[]; canonicalTitle: string }> {
  return apiFetch(`/campaigns/${campaignHandle}/wiki/${pageId}/historical-aliases`);
}

export async function createHistoricalAlias(
  campaignHandle: string,
  pageId: string,
  body: Partial<EntityHistoricalAliasRecord>,
): Promise<EntityHistoricalAliasRecord> {
  const data = await apiFetch<{ alias: EntityHistoricalAliasRecord }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/historical-aliases`,
    { method: 'POST', body: JSON.stringify(body) },
  );
  return data.alias;
}

export async function updateHistoricalAlias(
  campaignHandle: string,
  aliasId: string,
  body: Partial<EntityHistoricalAliasRecord>,
): Promise<EntityHistoricalAliasRecord> {
  const data = await apiFetch<{ alias: EntityHistoricalAliasRecord }>(
    `/campaigns/${campaignHandle}/wiki/historical-aliases/${aliasId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  return data.alias;
}

export async function deleteHistoricalAlias(
  campaignHandle: string,
  aliasId: string,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/wiki/historical-aliases/${aliasId}`, {
    method: 'DELETE',
  });
}

export async function fetchInterpretiveSummary(
  campaignHandle: string,
  pageId: string,
  viewDate?: ChronologyDateParts | null,
): Promise<InterpretiveSummaryResponse> {
  const params = viewDate
    ? `?viewDate=${encodeURIComponent(JSON.stringify(viewDate))}`
    : '';
  return apiFetch(`/campaigns/${campaignHandle}/wiki/${pageId}/interpretive-summary${params}`);
}

export async function fetchInterpretationsBundle(
  campaignHandle: string,
  pageId: string,
): Promise<{
  groups: LoreInterpretationGroupRecord[];
  accounts: LoreInterpretationAccountRecord[];
}> {
  return apiFetch(`/campaigns/${campaignHandle}/wiki/${pageId}/interpretations`);
}

export async function createInterpretationGroup(
  campaignHandle: string,
  pageId: string,
  body: { topic?: string | null; sortOrder?: number },
): Promise<LoreInterpretationGroupRecord> {
  const data = await apiFetch<{ group: LoreInterpretationGroupRecord }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/interpretation-groups`,
    { method: 'POST', body: JSON.stringify(body) },
  );
  return data.group;
}

export async function updateInterpretationGroup(
  campaignHandle: string,
  groupId: string,
  body: { topic?: string | null; sortOrder?: number },
): Promise<LoreInterpretationGroupRecord> {
  const data = await apiFetch<{ group: LoreInterpretationGroupRecord }>(
    `/campaigns/${campaignHandle}/wiki/interpretation-groups/${groupId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  return data.group;
}

export async function deleteInterpretationGroup(
  campaignHandle: string,
  groupId: string,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/wiki/interpretation-groups/${groupId}`, {
    method: 'DELETE',
  });
}

export async function createInterpretationAccount(
  campaignHandle: string,
  pageId: string,
  body: Partial<LoreInterpretationAccountRecord>,
): Promise<LoreInterpretationAccountRecord> {
  const data = await apiFetch<{ account: LoreInterpretationAccountRecord }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/interpretation-accounts`,
    { method: 'POST', body: JSON.stringify(body) },
  );
  return data.account;
}

export async function updateInterpretationAccount(
  campaignHandle: string,
  accountId: string,
  body: Partial<LoreInterpretationAccountRecord>,
): Promise<LoreInterpretationAccountRecord> {
  const data = await apiFetch<{ account: LoreInterpretationAccountRecord }>(
    `/campaigns/${campaignHandle}/wiki/interpretation-accounts/${accountId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  return data.account;
}

export async function deleteInterpretationAccount(
  campaignHandle: string,
  accountId: string,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/wiki/interpretation-accounts/${accountId}`, {
    method: 'DELETE',
  });
}

export async function fetchLoreClaims(
  campaignHandle: string,
  pageId: string,
): Promise<LoreClaimWithSources[]> {
  const data = await apiFetch<{ claims: LoreClaimWithSources[] }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/lore-claims`,
  );
  return data.claims ?? [];
}

export async function createLoreClaim(
  campaignHandle: string,
  pageId: string,
  body: Partial<LoreClaimRecord> & { sources?: Partial<LoreClaimSourceRecord>[] },
): Promise<LoreClaimWithSources> {
  const data = await apiFetch<{ claim: LoreClaimWithSources }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/lore-claims`,
    { method: 'POST', body: JSON.stringify(body) },
  );
  return data.claim;
}

export async function updateLoreClaim(
  campaignHandle: string,
  claimId: string,
  body: Partial<LoreClaimRecord> & { sources?: Partial<LoreClaimSourceRecord>[] },
): Promise<LoreClaimWithSources> {
  const data = await apiFetch<{ claim: LoreClaimWithSources }>(
    `/campaigns/${campaignHandle}/wiki/lore-claims/${claimId}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
  return data.claim;
}

export async function deleteLoreClaim(
  campaignHandle: string,
  claimId: string,
): Promise<void> {
  await apiFetch(`/campaigns/${campaignHandle}/wiki/lore-claims/${claimId}`, {
    method: 'DELETE',
  });
}

/** Map legacy CitationHooks to LoreClaimSource rows (DM migration helper). */
export function citationHooksToClaimSources(input: {
  sourcePageIds?: string[];
  sourceEventIds?: string[];
  note?: string | null;
}): Partial<LoreClaimSourceRecord>[] {
  const sources: Partial<LoreClaimSourceRecord>[] = [];
  for (const pageId of input.sourcePageIds ?? []) {
    sources.push({
      role: 'SUPPORTS',
      sourceType: 'OTHER',
      sourceEntityType: 'WIKI_PAGE',
      sourceEntityId: pageId,
      visibility: 'GM_ONLY',
    });
  }
  for (const eventId of input.sourceEventIds ?? []) {
    sources.push({
      role: 'SUPPORTS',
      sourceType: 'EVENT_RECORD',
      sourceEntityType: 'CALENDAR_EVENT',
      sourceEntityId: eventId,
      visibility: 'GM_ONLY',
    });
  }
  if (input.note?.trim()) {
    sources.push({
      role: 'REFERENCES',
      sourceType: 'OTHER',
      label: input.note.trim(),
      visibility: 'GM_ONLY',
    });
  }
  return sources;
}

export type PartyKnowledgeResponse = {
  isDiscovered: boolean;
  presenceState: string;
  isManagerView: boolean;
  discovery: DiscoveryStateProjection;
  availableFromEpochMinute?: number | null;
  groups: Record<
    'confirmed' | 'suspected' | 'disproven' | 'contested',
    LoreClaimWithSources[]
  >;
  isContested: boolean;
  claims: LoreClaimWithSources[];
  interpretations: LoreInterpretationAccountRecord[];
  canonDelta?: Array<{
    claimId: string;
    statement: string;
    partyState: string | null;
    gmResolution: string | null;
  }>;
};

export async function fetchPartyKnowledge(
  campaignHandle: string,
  pageId: string,
): Promise<PartyKnowledgeResponse> {
  const data = await apiFetch<{ knowledge: PartyKnowledgeResponse }>(
    `/campaigns/${campaignHandle}/wiki/${pageId}/party-knowledge`,
  );
  return data.knowledge;
}
