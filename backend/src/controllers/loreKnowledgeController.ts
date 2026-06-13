import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  appendNarrativeEvent,
  NarrativeEventType,
} from '../lib/narrativeEventService.js';
import {
  assertWikiPageInCampaign,
  buildInterpretiveSummary,
  buildPartyKnowledge,
  createHistoricalAlias,
  createInterpretationAccount,
  createInterpretationGroup,
  createLoreClaim,
  deleteHistoricalAlias,
  deleteInterpretationAccount,
  deleteInterpretationGroup,
  deleteLoreClaim,
  listHistoricalAliases,
  listInterpretationBundle,
  listLoreClaims,
  updateHistoricalAlias,
  updateInterpretationAccount,
  updateInterpretationGroup,
  updateLoreClaim,
} from '../lib/loreKnowledgeService.js';
import { normalizeChronologyDate } from '../lib/entityRelationTypes.js';
import { resolveCampaignChronologyNow } from '../lib/chronologyDefaults.js';
import {
  buildNarrativeViewerContext,
  projectLoreAtDate,
  type TemporalViewResolution,
} from '../../../shared/narrativeProjection.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

const LORE_KNOWLEDGE_UPDATED = 'LORE_KNOWLEDGE_UPDATED';

function serializeTemporalForJson(
  temporal: TemporalViewResolution,
): Omit<TemporalViewResolution, 'effectiveEpochMinute'> & { effectiveEpochMinute: string } {
  return {
    ...temporal,
    effectiveEpochMinute: temporal.effectiveEpochMinute.toString(),
  };
}

function parseViewDate(req: CampaignScopedRequest): ReturnType<typeof normalizeChronologyDate> {
  const raw = req.query.viewDate;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return normalizeChronologyDate(parsed);
    } catch {
      /* fall through */
    }
  }
  return null;
}

export async function listEntityHistoricalAliases(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const page = await assertWikiPageInCampaign(ctx.campaignId, pageId);
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }
  const aliases = await listHistoricalAliases(ctx.campaignId, pageId, ctx.role);
  res.json({ aliases, canonicalTitle: page.title });
}

export async function postEntityHistoricalAlias(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const page = await assertWikiPageInCampaign(ctx.campaignId, pageId);
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }
  const name = String((req.body as { name?: string }).name ?? '').trim();
  if (!name) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const alias = await createHistoricalAlias(
    ctx.campaignId,
    pageId,
    req.body as Record<string, unknown>,
  );
  if (req.user?.id) {
    await appendNarrativeEvent(prisma, {
      campaignId: ctx.campaignId,
      type: LORE_KNOWLEDGE_UPDATED,
      source: 'user',
      actorUserId: req.user.id,
      pageId,
      metadata: { action: 'historical_alias_created', stableKey: alias.stableKey },
    });
  }
  res.status(201).json({ alias });
}

export async function patchEntityHistoricalAlias(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const aliasId = String(req.params.aliasId);
  const alias = await updateHistoricalAlias(
    ctx.campaignId,
    aliasId,
    req.body as Record<string, unknown>,
  );
  if (!alias) {
    res.status(404).json({ error: 'Alias not found' });
    return;
  }
  if (req.user?.id) {
    await appendNarrativeEvent(prisma, {
      campaignId: ctx.campaignId,
      type: LORE_KNOWLEDGE_UPDATED,
      source: 'user',
      actorUserId: req.user.id,
      pageId: alias.pageId,
      metadata: { action: 'historical_alias_updated', stableKey: alias.stableKey },
    });
  }
  res.json({ alias });
}

export async function removeEntityHistoricalAlias(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const aliasId = String(req.params.aliasId);
  const ok = await deleteHistoricalAlias(ctx.campaignId, aliasId);
  if (!ok) {
    res.status(404).json({ error: 'Alias not found' });
    return;
  }
  res.json({ ok: true });
}

export async function getInterpretiveSummary(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const page = await assertWikiPageInCampaign(ctx.campaignId, pageId);
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }
  const [campaign, defaultDateParts] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: ctx.campaignId },
      select: { currentEpochMinute: true },
    }),
    resolveCampaignChronologyNow(ctx.campaignId),
  ]);
  const viewerCtx = buildNarrativeViewerContext({
    role: ctx.role ?? null,
    campaignNow: {
      epochMinute: campaign?.currentEpochMinute ?? 0n,
      dateParts: defaultDateParts,
    },
  });
  const temporal = projectLoreAtDate(
    viewerCtx,
    parseViewDate(req) ?? undefined,
  );
  const summary = await buildInterpretiveSummary(
    ctx.campaignId,
    pageId,
    page.title,
    ctx.role,
    temporal.effectiveDateParts,
  );
  res.json({
    ...summary,
    projectionMeta: { temporal: serializeTemporalForJson(temporal) },
  });
}

export async function getInterpretationsBundle(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const page = await assertWikiPageInCampaign(ctx.campaignId, pageId);
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }
  const bundle = await listInterpretationBundle(ctx.campaignId, pageId, ctx.role);
  res.json(bundle);
}

export async function postInterpretationGroup(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const page = await assertWikiPageInCampaign(ctx.campaignId, pageId);
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }
  const group = await createInterpretationGroup(
    ctx.campaignId,
    pageId,
    req.body as Record<string, unknown>,
  );
  res.status(201).json({ group });
}

export async function patchInterpretationGroup(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const groupId = String(req.params.groupId);
  const group = await updateInterpretationGroup(
    ctx.campaignId,
    groupId,
    req.body as Record<string, unknown>,
  );
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  res.json({ group });
}

export async function removeInterpretationGroup(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const groupId = String(req.params.groupId);
  const ok = await deleteInterpretationGroup(ctx.campaignId, groupId);
  if (!ok) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  res.json({ ok: true });
}

export async function postInterpretationAccount(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const page = await assertWikiPageInCampaign(ctx.campaignId, pageId);
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }
  const title = String((req.body as { title?: string }).title ?? '').trim();
  if (!title) {
    res.status(400).json({ error: 'title required' });
    return;
  }
  const account = await createInterpretationAccount(
    ctx.campaignId,
    pageId,
    req.body as Record<string, unknown>,
  );
  res.status(201).json({ account });
}

export async function patchInterpretationAccount(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const accountId = String(req.params.accountId);
  const account = await updateInterpretationAccount(
    ctx.campaignId,
    accountId,
    req.body as Record<string, unknown>,
  );
  if (!account) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  res.json({ account });
}

export async function removeInterpretationAccount(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const accountId = String(req.params.accountId);
  const ok = await deleteInterpretationAccount(ctx.campaignId, accountId);
  if (!ok) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  res.json({ ok: true });
}

export async function getLoreClaims(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const page = await assertWikiPageInCampaign(ctx.campaignId, pageId);
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }
  const claims = await listLoreClaims(ctx.campaignId, pageId, ctx.role);
  res.json({ claims });
}

export async function postLoreClaim(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const page = await assertWikiPageInCampaign(ctx.campaignId, pageId);
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }
  const statement = String((req.body as { statement?: string }).statement ?? '').trim();
  if (!statement) {
    res.status(400).json({ error: 'statement required' });
    return;
  }
  const claim = await createLoreClaim(
    ctx.campaignId,
    pageId,
    req.body as Record<string, unknown>,
  );
  res.status(201).json({ claim });
}

export async function patchLoreClaim(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const claimId = String(req.params.claimId);
  const claim = await updateLoreClaim(
    ctx.campaignId,
    claimId,
    req.body as Record<string, unknown>,
  );
  if (!claim) {
    res.status(404).json({ error: 'Claim not found' });
    return;
  }
  res.json({ claim });
}

export async function removeLoreClaim(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const claimId = String(req.params.claimId);
  const ok = await deleteLoreClaim(ctx.campaignId, claimId);
  if (!ok) {
    res.status(404).json({ error: 'Claim not found' });
    return;
  }
  res.json({ ok: true });
}

export async function getPartyKnowledge(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const page = await assertWikiPageInCampaign(ctx.campaignId, pageId);
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }
  const knowledge = await buildPartyKnowledge(
    ctx.campaignId,
    pageId,
    ctx.role,
  );
  res.json({ knowledge, canonicalTitle: page.title });
}

export { NarrativeEventType, LORE_KNOWLEDGE_UPDATED };
