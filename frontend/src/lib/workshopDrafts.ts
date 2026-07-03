import type { AuthoringContextKind } from '@shared/authoringContext';
import type {
  FormalizeWorkshopDraftInput,
  WorkshopDocument,
  WorkshopFieldShadow,
  WorkshopFormalizeTarget,
} from '@shared/workshopDocument';
import { apiFetch } from './api';

export type { WorkshopDocument, FormalizeWorkshopDraftInput, WorkshopFieldShadow };

export type WorkshopSaveState = 'idle' | 'saving' | 'saved' | 'error';

export async function fetchWorkshopDrafts(
  campaignHandle: string,
  options?: {
    status?: 'active' | 'formalized' | 'discarded';
    anchor?: string;
    limit?: number;
  },
): Promise<WorkshopDocument[]> {
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.anchor) params.set('anchor', options.anchor);
  if (options?.limit) params.set('limit', String(options.limit));
  const query = params.toString();
  const data = await apiFetch<{ drafts: WorkshopDocument[] }>(
    `/campaigns/${campaignHandle}/workshop/drafts${query ? `?${query}` : ''}`,
  );
  return data.drafts;
}

export async function fetchWorkshopDraft(
  campaignHandle: string,
  draftId: string,
): Promise<WorkshopDocument> {
  const data = await apiFetch<{ draft: WorkshopDocument }>(
    `/campaigns/${campaignHandle}/workshop/drafts/${draftId}`,
  );
  return data.draft;
}

export async function bootstrapAnchoredWorkshopDraft(
  campaignHandle: string,
  input: { anchorPageId: string; sourceKind?: AuthoringContextKind },
): Promise<WorkshopDocument> {
  const data = await apiFetch<{ draft: WorkshopDocument }>(
    `/campaigns/${campaignHandle}/workshop/drafts/bootstrap`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return data.draft;
}

export async function createWorkshopDraft(
  campaignHandle: string,
  input?: {
    title?: string;
    bodyMarkdown?: string;
    anchorEntityIds?: string[];
    sourceKind?: AuthoringContextKind;
    intendedTarget?: WorkshopFormalizeTarget;
  },
): Promise<WorkshopDocument> {
  const data = await apiFetch<{ draft: WorkshopDocument }>(
    `/campaigns/${campaignHandle}/workshop/drafts`,
    {
      method: 'POST',
      body: JSON.stringify(input ?? {}),
    },
  );
  return data.draft;
}

export async function patchWorkshopDraft(
  campaignHandle: string,
  draftId: string,
  input: { title?: string; bodyMarkdown?: string; fieldShadow?: WorkshopFieldShadow },
): Promise<WorkshopDocument> {
  const data = await apiFetch<{ draft: WorkshopDocument }>(
    `/campaigns/${campaignHandle}/workshop/drafts/${draftId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
  return data.draft;
}

export async function applyWorkshopDraft(
  campaignHandle: string,
  draftId: string,
): Promise<WorkshopDocument> {
  const data = await apiFetch<{ draft: WorkshopDocument }>(
    `/campaigns/${campaignHandle}/workshop/drafts/${draftId}/apply`,
    { method: 'POST', body: '{}' },
  );
  return data.draft;
}

export async function fetchWorkshopWritingContext(
  campaignHandle: string,
  draftId: string,
): Promise<{ hints: string[]; linkCount: number; anchorPageId: string | null }> {
  return apiFetch(`/campaigns/${campaignHandle}/workshop/drafts/${draftId}/writing-context`);
}

export async function formalizeWorkshopDraft(
  campaignHandle: string,
  draftId: string,
  input: FormalizeWorkshopDraftInput,
): Promise<{ formalizedPageId: string; target: WorkshopFormalizeTarget }> {
  return apiFetch(`/campaigns/${campaignHandle}/workshop/drafts/${draftId}/formalize`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function countWikilinksInMarkdown(markdown: string): number {
  const matches = markdown.match(/\[\[[^\]]+\]\]/g);
  return matches?.length ?? 0;
}

export function countWordsInMarkdown(markdown: string): number {
  const trimmed = markdown.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
