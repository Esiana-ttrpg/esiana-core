import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  bulkSetContentPresenceState,
  type ContentPresenceRef,
} from '../lib/contentPresenceService.js';
import {
  ContentPresenceEntityType,
  ContentRevelationStates,
} from '../../../shared/contentPresence.js';

function parseAvailableFromEpochMinute(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
  }
  return null;
}

function isEntityType(value: unknown): value is ContentPresenceRef['entityType'] {
  return Object.values(ContentPresenceEntityType).includes(
    value as ContentPresenceRef['entityType'],
  );
}

function parseRefs(value: unknown): ContentPresenceRef[] {
  if (!Array.isArray(value)) return [];
  const refs: ContentPresenceRef[] = [];
  for (const entry of value) {
    const row = entry as Record<string, unknown>;
    if (!isEntityType(row.entityType)) continue;
    if (typeof row.entityId !== 'string') continue;
    refs.push({
      entityType: row.entityType,
      entityId: row.entityId,
      subEntityId:
        typeof row.subEntityId === 'string' ? row.subEntityId : null,
    });
  }
  return refs;
}

export async function bulkRevealContentPresence(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const refs = parseRefs(body.refs);
  const state =
    body.state === ContentRevelationStates.HIDDEN ||
    body.state === ContentRevelationStates.DRAFT
      ? body.state
      : ContentRevelationStates.REVEALED;
  if (refs.length === 0) {
    res.status(400).json({ error: 'refs must include at least one entity' });
    return;
  }

  const updated = await bulkSetContentPresenceState(campaignId, refs, state, {
    revealedByUserId: req.user?.id ?? null,
    workflowKey: typeof body.workflowKey === 'string' ? body.workflowKey : null,
    reason: typeof body.reason === 'string' ? body.reason : null,
    ...(parseAvailableFromEpochMinute(body.availableFromEpochMinute) !== undefined
      ? {
          availableFromEpochMinute: parseAvailableFromEpochMinute(
            body.availableFromEpochMinute,
          ),
        }
      : {}),
  });

  res.json({ updated });
}

export async function previewRevealImpact(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const refs = parseRefs(body.refs);
  const countsByType = refs.reduce<Record<string, number>>((acc, ref) => {
    acc[ref.entityType] = (acc[ref.entityType] ?? 0) + 1;
    return acc;
  }, {});
  res.json({
    totalTargets: refs.length,
    countsByType,
  });
}
