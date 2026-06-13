import { apiFetch } from './api';
import type {
  EntityGraphEntityType,
  EntityRelationKind,
  LocalGraphQueryResult,
} from '@shared/entityGraph';

export type FetchLocalEntityGraphParams = {
  campaignHandle: string;
  entityType: EntityGraphEntityType;
  entityId: string;
  depth?: number;
  kinds?: EntityRelationKind[];
  includeSuppressed?: boolean;
};

export async function fetchLocalEntityGraph(
  params: FetchLocalEntityGraphParams,
): Promise<LocalGraphQueryResult> {
  const search = new URLSearchParams({
    entityType: params.entityType,
    entityId: params.entityId,
    depth: String(params.depth ?? 1),
  });
  if (params.kinds?.length) {
    search.set('kinds', params.kinds.join(','));
  }
  if (params.includeSuppressed) {
    search.set('includeSuppressed', 'true');
  }
  return apiFetch<LocalGraphQueryResult>(
    `/campaigns/${params.campaignHandle}/entity-graph?${search.toString()}`,
  );
}

export type { LocalGraphQueryResult };
