import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { CampaignMemberRoles } from '../types/domain.js';
import {
  TemporalMetadataError,
  applyTemporalMetadata,
  buildTemporalWriteContext,
  parseTemporalWriteEnvelope,
  resolveTemporalAuthority,
  type TemporalActor,
  type TemporalBounds,
  type TemporalWriteContext,
  type WriteProvenance,
} from './temporalProvenance.js';

export interface ResolvedTemporalWrite {
  ctx: TemporalWriteContext;
  authority: ReturnType<typeof resolveTemporalAuthority>;
  metadata: import('./temporalProvenance.js').TemporalMetadata | undefined;
  provenance: WriteProvenance;
}

export function extractTemporalFromBody(body: unknown): {
  temporal: ReturnType<typeof parseTemporalWriteEnvelope>;
  rest: Record<string, unknown>;
} {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { temporal: null, rest: {} };
  }
  const record = { ...(body as Record<string, unknown>) };
  const temporal = parseTemporalWriteEnvelope(record.temporal);
  delete record.temporal;
  return { temporal, rest: record };
}

export function buildTemporalActor(
  req: AuthenticatedRequest & Partial<CampaignScopedRequest>,
  options?: { isSystemJob?: boolean; pluginId?: string },
): TemporalActor {
  const role = req.campaign?.role;
  return {
    role: req.user?.role ?? 'USER',
    tokenScopes: req.apiTokenScopes,
    isSystemJob: options?.isSystemJob,
    pluginId: options?.pluginId,
    isCoreSeedJob: req.apiTokenName === 'campaign-generator-ephemeral',
    isOperationalManager: role
      ? role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
      : false,
  };
}

export function resolveTemporalFromRequest(
  req: AuthenticatedRequest & Partial<CampaignScopedRequest>,
  temporal: ReturnType<typeof parseTemporalWriteEnvelope>,
  options?: { isSystemJob?: boolean; pluginId?: string },
): ResolvedTemporalWrite | null {
  if (!temporal || !req.user?.id) return null;

  const ctx = buildTemporalWriteContext(temporal, req.user.id);
  const actor = buildTemporalActor(req, options);
  const authority = resolveTemporalAuthority(ctx, actor);

  return {
    ctx,
    authority,
    metadata: temporal.metadata,
    provenance: temporal.provenance,
  };
}

export function rejectTemporalError(res: Response, err: unknown): void {
  if (err instanceof TemporalMetadataError) {
    res.status(400).json({ error: err.message, code: err.code });
    return;
  }
  throw err;
}

export function applyWikiPageTemporalData(
  data: { createdAt?: Date; updatedAt?: Date },
  resolved: ResolvedTemporalWrite | null,
  actor: TemporalActor,
  bounds: TemporalBounds,
): {
  data: { createdAt?: Date; updatedAt?: Date };
  lastViewedAt?: Date;
  applied: boolean;
  provenance: WriteProvenance;
} {
  if (!resolved) {
    return { data, applied: false, provenance: 'user' };
  }

  const result = applyTemporalMetadata(
    data,
    resolved.metadata,
    resolved.ctx,
    actor,
    resolved.authority,
    bounds,
  );

  return {
    data: result.data,
    lastViewedAt: result.lastViewedAt,
    applied: result.applied,
    provenance: resolved.provenance,
  };
}

export function validateTemporalEnvelope(
  res: Response,
  temporal: ReturnType<typeof parseTemporalWriteEnvelope>,
  resolved: ResolvedTemporalWrite | null,
): boolean {
  if (!temporal) return true;
  if (!resolved) {
    res.status(400).json({ error: 'Invalid temporal envelope' });
    return false;
  }
  if (
    temporal.preserveTemporalHistory &&
    resolved.authority === 'untrusted' &&
    resolved.provenance === 'restore'
  ) {
    res.status(403).json({
      error: 'Insufficient authority for restore temporal metadata',
    });
    return false;
  }
  return true;
}
