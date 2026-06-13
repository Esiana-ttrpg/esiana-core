import { apiFetch } from './api';
import type { RelationsRenderModel } from '@shared/relationshipLensProjections';

export type RelationsProjectionParams = {
  campaignHandle: string;
  lens?: 'social' | 'structure' | 'kinship';
  mode?: string;
  level?: 'summary' | 'cluster' | 'entity';
  focus?: string;
  at?: string;
  includeHistorical?: boolean;
};

export type RelationsProjectionResult = RelationsRenderModel & {
  projectionVersion: string;
};

export async function fetchRelationsProjection(
  params: RelationsProjectionParams,
): Promise<RelationsProjectionResult> {
  const search = new URLSearchParams();
  if (params.lens) search.set('lens', params.lens);
  if (params.mode) search.set('mode', params.mode);
  if (params.level) search.set('level', params.level);
  if (params.focus) search.set('focus', params.focus);
  if (params.at) search.set('at', params.at);
  if (params.includeHistorical) search.set('includeHistorical', 'true');
  const qs = search.toString();
  return apiFetch<RelationsProjectionResult>(
    `/campaigns/${params.campaignHandle}/entity-graph/projection${qs ? `?${qs}` : ''}`,
  );
}
