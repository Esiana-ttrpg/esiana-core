import {
  applyTemporalMetadata,
  type TemporalMetadata,
  type WriteProvenance,
} from './temporalProvenance.js';

const EXPORT_CREATED_KEY = 'esiana_created_at';
const EXPORT_UPDATED_KEY = 'esiana_updated_at';

export function temporalFieldsForExport(page: {
  createdAt: Date;
  updatedAt: Date;
}): Record<string, string> {
  return {
    [EXPORT_CREATED_KEY]: page.createdAt.toISOString(),
    [EXPORT_UPDATED_KEY]: page.updatedAt.toISOString(),
  };
}

export function extractTemporalFromFrontMatter(
  customFields: Record<string, string>,
  frontMatterDate?: string,
): TemporalMetadata | undefined {
  const createdAt =
    customFields[EXPORT_CREATED_KEY]?.trim() ||
    customFields.date?.trim() ||
    frontMatterDate?.trim();
  const updatedAt = customFields[EXPORT_UPDATED_KEY]?.trim();

  if (!createdAt && !updatedAt) return undefined;

  return {
    ...(createdAt ? { createdAt } : {}),
    ...(updatedAt ? { updatedAt: updatedAt || createdAt } : {}),
  };
}

export function applySystemProvenanceTimestamps(
  provenance: WriteProvenance,
  metadata: TemporalMetadata | undefined,
  bounds: { campaignCreatedAt?: Date; now?: Date } = {},
): { createdAt?: Date; updatedAt?: Date } {
  if (!metadata) return {};

  const ctx = {
    provenance,
    preserveTemporalHistory: true,
    actorUserId: 'system',
  };

  const authority =
    provenance === 'restore' || provenance === 'migration'
      ? ('system' as const)
      : ('trusted-import' as const);

  const { data } = applyTemporalMetadata(
    {},
    metadata,
    ctx,
    { role: 'SYSTEM_ADMIN', isSystemJob: true },
    authority,
    bounds,
  );

  return data;
}
