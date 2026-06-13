/**
 * Provenance-aware temporal writes — centralized policy for imports, restores, seeders.
 * @see docs/architecture-internal/temporal-integrity.md
 */

export const WriteProvenances = [
  'user',
  'import',
  'restore',
  'seed',
  'migration',
  'repair',
] as const;

export type WriteProvenance = (typeof WriteProvenances)[number];

export const TemporalAuthorities = [
  'none',
  'untrusted',
  'trusted-import',
  'system',
] as const;

export type TemporalAuthority = (typeof TemporalAuthorities)[number];

export interface TemporalMetadata {
  createdAt?: string;
  updatedAt?: string;
  lastViewedAt?: string;
}

/** Client-supplied temporal envelope on domain writes. */
export interface TemporalWriteEnvelope {
  provenance: WriteProvenance;
  preserveTemporalHistory?: boolean;
  metadata?: TemporalMetadata;
  jobId?: string;
}

export interface TemporalWriteContext {
  provenance: WriteProvenance;
  authority?: TemporalAuthority;
  preserveTemporalHistory?: boolean;
  actorUserId: string;
  jobId?: string;
}

export interface TemporalActor {
  role: string;
  tokenScopes?: string[];
  isSystemJob?: boolean;
  pluginId?: string;
  isOperationalManager?: boolean;
  /** Host-orchestrated sample data / content pack import job. */
  isCoreSeedJob?: boolean;
}

export class TemporalMetadataError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'TemporalMetadataError';
  }
}

const PROVENANCE_SET = new Set<string>(WriteProvenances);

export function isWriteProvenance(value: string): value is WriteProvenance {
  return PROVENANCE_SET.has(value);
}

export function parseTemporalWriteEnvelope(raw: unknown): TemporalWriteEnvelope | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;

  const record = raw as Record<string, unknown>;
  const provenance = record.provenance;
  if (typeof provenance !== 'string' || !isWriteProvenance(provenance)) {
    return null;
  }

  const metadata = record.metadata;
  let parsedMetadata: TemporalMetadata | undefined;
  if (metadata !== undefined) {
    if (typeof metadata !== 'object' || Array.isArray(metadata)) return null;
    const m = metadata as Record<string, unknown>;
    parsedMetadata = {};
    for (const key of ['createdAt', 'updatedAt', 'lastViewedAt'] as const) {
      if (m[key] !== undefined) {
        if (typeof m[key] !== 'string') return null;
        parsedMetadata[key] = m[key];
      }
    }
  }

  return {
    provenance,
    preserveTemporalHistory:
      record.preserveTemporalHistory === true ? true : undefined,
    metadata: parsedMetadata,
    jobId: typeof record.jobId === 'string' ? record.jobId : undefined,
  };
}

export function resolveTemporalAuthority(
  ctx: TemporalWriteContext,
  actor: TemporalActor,
): TemporalAuthority {
  if (ctx.provenance === 'user') return 'none';

  if (actor.isSystemJob) {
    if (ctx.provenance === 'restore' || ctx.provenance === 'migration') {
      return 'system';
    }
    if (ctx.provenance === 'import' || ctx.provenance === 'repair') {
      return 'trusted-import';
    }
  }

  if (ctx.provenance === 'restore' && actor.isSystemJob) {
    return 'system';
  }

  if (ctx.provenance === 'migration' && actor.role === 'SYSTEM_ADMIN') {
    return 'system';
  }

  if (ctx.provenance === 'seed') {
    const hasSeedScope =
      actor.tokenScopes?.includes('campaign:seed') ||
      actor.tokenScopes?.length === 0;
    if (hasSeedScope && actor.pluginId === 'campaign-seeder') {
      return 'trusted-import';
    }
    if (hasSeedScope && actor.isCoreSeedJob) {
      return 'trusted-import';
    }
    if (hasSeedScope && actor.isOperationalManager) {
      return 'trusted-import';
    }
    return 'untrusted';
  }

  if (ctx.provenance === 'import') {
    if (actor.isSystemJob || actor.isOperationalManager) {
      return 'trusted-import';
    }
    return 'untrusted';
  }

  if (ctx.provenance === 'restore') {
    return actor.isSystemJob ? 'system' : 'untrusted';
  }

  if (ctx.provenance === 'repair') {
    return actor.role === 'SYSTEM_ADMIN' ? 'system' : 'untrusted';
  }

  if (ctx.provenance === 'migration') {
    return actor.role === 'SYSTEM_ADMIN' ? 'system' : 'untrusted';
  }

  return 'none';
}

export function canOverrideTemporalMetadata(
  ctx: TemporalWriteContext,
  _actor: TemporalActor,
  authority: TemporalAuthority,
): boolean {
  if (authority === 'none') return false;
  if (!ctx.preserveTemporalHistory) return false;
  if (ctx.provenance === 'user') return false;
  return true;
}

function parseIsoDate(value: string, field: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new TemporalMetadataError(`Invalid ${field} date`, 'INVALID_DATE');
  }
  return d;
}

export interface TemporalBounds {
  campaignCreatedAt?: Date;
  now?: Date;
}

export function clampTemporalDate(
  date: Date,
  bounds: TemporalBounds,
): Date {
  const now = bounds.now ?? new Date();
  if (date.getTime() > now.getTime()) {
    return now;
  }
  if (bounds.campaignCreatedAt && date.getTime() < bounds.campaignCreatedAt.getTime()) {
    return bounds.campaignCreatedAt;
  }
  return date;
}

export interface ApplyTemporalResult<T> {
  data: T;
  applied: boolean;
  authority: TemporalAuthority;
  lastViewedAt?: Date;
}

export function applyTemporalMetadata<
  T extends { createdAt?: Date; updatedAt?: Date },
>(
  entity: T,
  metadata: TemporalMetadata | undefined,
  ctx: TemporalWriteContext,
  actor: TemporalActor,
  authority: TemporalAuthority,
  bounds: TemporalBounds = {},
): ApplyTemporalResult<T> {
  const resolvedAuthority =
    authority === 'none' && ctx.authority
      ? ctx.authority
      : authority;

  if (!canOverrideTemporalMetadata(ctx, actor, resolvedAuthority)) {
    return { data: entity, applied: false, authority: resolvedAuthority };
  }

  if (!metadata) {
    return { data: entity, applied: false, authority: resolvedAuthority };
  }

  const out = { ...entity };
  let applied = false;
  let lastViewedAt: Date | undefined;

  const allowCreated =
    resolvedAuthority === 'trusted-import' ||
    resolvedAuthority === 'system' ||
    resolvedAuthority === 'untrusted';
  const allowUpdated =
    resolvedAuthority === 'trusted-import' || resolvedAuthority === 'system';
  const allowLastViewed =
    resolvedAuthority === 'trusted-import' || resolvedAuthority === 'system';

  if (allowCreated && metadata.createdAt) {
    out.createdAt = clampTemporalDate(
      parseIsoDate(metadata.createdAt, 'createdAt'),
      bounds,
    );
    applied = true;
  }

  if (allowUpdated && metadata.updatedAt) {
    out.updatedAt = clampTemporalDate(
      parseIsoDate(metadata.updatedAt, 'updatedAt'),
      bounds,
    );
    applied = true;
  } else if (allowCreated && metadata.createdAt && !metadata.updatedAt) {
    out.updatedAt = out.createdAt;
    applied = true;
  }

  if (allowLastViewed && metadata.lastViewedAt) {
    lastViewedAt = clampTemporalDate(
      parseIsoDate(metadata.lastViewedAt, 'lastViewedAt'),
      bounds,
    );
    applied = true;
  }

  if (
    out.createdAt &&
    out.updatedAt &&
    out.updatedAt.getTime() < out.createdAt.getTime()
  ) {
    out.updatedAt = out.createdAt;
  }

  return {
    data: out,
    applied,
    authority: resolvedAuthority,
    lastViewedAt,
  };
}

export function buildTemporalWriteContext(
  envelope: TemporalWriteEnvelope,
  actorUserId: string,
): TemporalWriteContext {
  return {
    provenance: envelope.provenance,
    preserveTemporalHistory: envelope.preserveTemporalHistory,
    actorUserId,
    jobId: envelope.jobId,
  };
}

export function provenanceForActivityEntityType(
  provenance: WriteProvenance,
): string {
  if (provenance === 'user') return 'WIKI_PAGE';
  return `${provenance.toUpperCase()}_WIKI_PAGE`;
}
