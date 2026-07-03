import { apiFetch } from './api';
import type {
  ContentReadiness,
  CursorPage,
  JournalLibraryItemDTO,
  JournalLibrarySort,
  JournalPlannerResponse,
  JournalPublicationDTO,
  JournalPublicationType,
  JournalSeriesDTO,
  JournalSeriesMode,
  JournalSourceKind,
  PerceivedPlannerState,
} from '@shared/journalPublication';
import type {
  ConditionDiagnostic,
  PlanState,
  ReleaseNode,
} from '@shared/journalReleaseRule';

export type {
  JournalLibraryItemDTO,
  JournalPlannerItemDTO,
  JournalPlannerResponse,
  JournalPublicationDTO,
  JournalPublicationType,
  JournalSeriesDTO,
  JournalLinkedPageRef,
} from '@shared/journalPublication';
export type { ReleaseNode, ConditionDiagnostic } from '@shared/journalReleaseRule';

const scope = (campaignHandle: string): string => `/campaigns/${campaignHandle}/journal`;

export interface JournalLibraryQuery {
  type?: JournalPublicationType;
  seriesId?: string;
  linkedPageId?: string;
  q?: string;
  sort?: JournalLibrarySort;
  cursor?: string | null;
  limit?: number;
}

export async function fetchJournalLibrary(
  campaignHandle: string,
  query: JournalLibraryQuery = {},
): Promise<CursorPage<JournalLibraryItemDTO>> {
  const params = new URLSearchParams();
  if (query.type) params.set('type', query.type);
  if (query.seriesId) params.set('seriesId', query.seriesId);
  if (query.linkedPageId) params.set('linkedPageId', query.linkedPageId);
  if (query.q?.trim()) params.set('q', query.q.trim());
  if (query.sort) params.set('sort', query.sort);
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  return apiFetch<CursorPage<JournalLibraryItemDTO>>(
    `${scope(campaignHandle)}/library${qs ? `?${qs}` : ''}`,
  );
}

export async function fetchJournalPlanner(
  campaignHandle: string,
  query: { cursor?: string | null; limit?: number } = {},
): Promise<JournalPlannerResponse> {
  const params = new URLSearchParams();
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  return apiFetch<JournalPlannerResponse>(
    `${scope(campaignHandle)}/planner${qs ? `?${qs}` : ''}`,
  );
}

export async function fetchJournalPublication(
  campaignHandle: string,
  id: string,
): Promise<JournalPublicationDTO> {
  const response = await apiFetch<{ publication: JournalPublicationDTO }>(
    `${scope(campaignHandle)}/publications/${id}`,
  );
  return response.publication;
}

export interface CreateJournalPublicationInput {
  title?: string;
  type?: JournalPublicationType;
  seriesId?: string | null;
  linkedPageId?: string | null;
  sourceKind?: JournalSourceKind;
  workshopDraftId?: string | null;
  contentMarkdown?: string | null;
  contentBlocks?: unknown[] | null;
}

export async function createJournalPublication(
  campaignHandle: string,
  input: CreateJournalPublicationInput,
): Promise<JournalPublicationDTO> {
  const response = await apiFetch<{ publication: JournalPublicationDTO }>(
    `${scope(campaignHandle)}/publications`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  return response.publication;
}

export interface UpdateJournalPublicationInput {
  title?: string;
  type?: JournalPublicationType;
  linkedPageId?: string | null;
  contentMarkdown?: string | null;
  contentBlocks?: unknown[] | null;
  sourceKind?: JournalSourceKind;
  workshopDraftId?: string | null;
  /** Archive/unarchive only; scheduling flows through the rule endpoint. */
  status?: 'draft' | 'archived';
}

export async function updateJournalPublication(
  campaignHandle: string,
  id: string,
  input: UpdateJournalPublicationInput,
): Promise<JournalPublicationDTO> {
  const response = await apiFetch<{ publication: JournalPublicationDTO }>(
    `${scope(campaignHandle)}/publications/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
  return response.publication;
}

export async function deleteJournalPublication(
  campaignHandle: string,
  id: string,
): Promise<void> {
  await apiFetch<Record<string, never>>(`${scope(campaignHandle)}/publications/${id}`, {
    method: 'DELETE',
  });
}

export async function saveJournalPublicationRule(
  campaignHandle: string,
  id: string,
  releaseRule: ReleaseNode | null,
): Promise<JournalPublicationDTO> {
  const response = await apiFetch<{ publication: JournalPublicationDTO }>(
    `${scope(campaignHandle)}/publications/${id}/rule`,
    { method: 'PUT', body: JSON.stringify({ releaseRule }) },
  );
  return response.publication;
}

export interface JournalEvaluationResult {
  planState: PlanState;
  perceivedState: PerceivedPlannerState;
  contentReadiness: ContentReadiness;
  releasable: boolean;
  diagnostics: ConditionDiagnostic[];
}

export async function evaluateJournalPublication(
  campaignHandle: string,
  id: string,
): Promise<JournalEvaluationResult> {
  return apiFetch<JournalEvaluationResult>(
    `${scope(campaignHandle)}/publications/${id}/evaluate`,
    { method: 'POST' },
  );
}

export async function releaseJournalPublication(
  campaignHandle: string,
  id: string,
  options: { override?: boolean } = {},
): Promise<JournalPublicationDTO> {
  const response = await apiFetch<{ publication: JournalPublicationDTO }>(
    `${scope(campaignHandle)}/publications/${id}/release`,
    { method: 'POST', body: JSON.stringify({ override: options.override ?? false }) },
  );
  return response.publication;
}

// --- Series ---------------------------------------------------------------

export async function fetchJournalSeries(
  campaignHandle: string,
): Promise<JournalSeriesDTO[]> {
  const response = await apiFetch<{ series: JournalSeriesDTO[] }>(
    `${scope(campaignHandle)}/series`,
  );
  return response.series;
}

export interface JournalSeriesInput {
  name?: string;
  description?: string | null;
  defaultType?: JournalPublicationType;
  linkedPageId?: string | null;
  templateWorkshopDraftId?: string | null;
  namingScheme?: string | null;
  seriesMode?: JournalSeriesMode;
  nextIssueRule?: ReleaseNode | null;
}

export async function createJournalSeries(
  campaignHandle: string,
  input: JournalSeriesInput,
): Promise<JournalSeriesDTO> {
  const response = await apiFetch<{ series: JournalSeriesDTO }>(
    `${scope(campaignHandle)}/series`,
    { method: 'POST', body: JSON.stringify(input) },
  );
  return response.series;
}

export async function updateJournalSeries(
  campaignHandle: string,
  id: string,
  input: JournalSeriesInput,
): Promise<JournalSeriesDTO> {
  const response = await apiFetch<{ series: JournalSeriesDTO }>(
    `${scope(campaignHandle)}/series/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
  return response.series;
}

export async function deleteJournalSeries(
  campaignHandle: string,
  id: string,
): Promise<void> {
  await apiFetch<Record<string, never>>(`${scope(campaignHandle)}/series/${id}`, {
    method: 'DELETE',
  });
}

export async function generateNextSeriesIssue(
  campaignHandle: string,
  id: string,
): Promise<{ created: boolean; publicationId: string }> {
  return apiFetch<{ created: boolean; publicationId: string }>(
    `${scope(campaignHandle)}/series/${id}/generate-next`,
    { method: 'POST' },
  );
}
