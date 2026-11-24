import { resolveAdventureAudience, filterAdventurePreviewPages } from '../lib/adventureAudience.js';
import { visibleAdventureEventIds } from '../lib/adventureAudienceEvents.js';
import { isVisibleAdventureKnowledgeSource } from '../lib/adventureKnowledgeSource.js';
import { buildNarrativeViewerContextFromRequest } from '../lib/narrativeProjectionContext.js';
import { visibleAdventureSessionIds } from '../lib/adventureSessionAudience.js';
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
  const audience = resolveAdventureAudience(ctx, req.query.previewAsPlayer, null);
  const page = audience.preview
    ? (await filterAdventurePreviewPages(ctx.campaignId,
      await prisma.wikiPage.findMany({ where: { campaignId: ctx.campaignId, deletedAt: null } }), audience.canViewPage))
        .find(row => row.id === pageId)
    : await assertWikiPageInCampaign(ctx.campaignId, pageId);
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }
  const aliases = (await listHistoricalAliases(ctx.campaignId, pageId, audience.preview ? null : ctx.role))
    .filter(alias => !audience.preview || (!alias.isSecret && alias.playerDiscoverable));
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
  await prisma.wikiPage.update({
    where: { id: pageId },
    data: { updatedAt: new Date() },
  });
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
  await prisma.wikiPage.update({
    where: { id: alias.pageId },
    data: { updatedAt: new Date() },
  });
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
  const existing = await prisma.entityHistoricalAlias.findFirst({
    where: { id: aliasId, campaignId: ctx.campaignId },
    select: { pageId: true },
  });
  const ok = await deleteHistoricalAlias(ctx.campaignId, aliasId);
  if (!ok) {
    res.status(404).json({ error: 'Alias not found' });
    return;
  }
  if (existing) {
    await prisma.wikiPage.update({
      where: { id: existing.pageId },
      data: { updatedAt: new Date() },
    });
  }
  res.json({ ok: true });
}

export async function getInterpretiveSummary(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const audience = resolveAdventureAudience(ctx, req.query.previewAsPlayer, null);
  const page = audience.preview
    ? (await filterAdventurePreviewPages(ctx.campaignId,
        await prisma.wikiPage.findMany({ where: { campaignId: ctx.campaignId, deletedAt: null } }), audience.canViewPage))
        .find(row => row.id === pageId)
    : await assertWikiPageInCampaign(ctx.campaignId, pageId);
  if (!page) { res.status(404).json({ error: 'Page not found' }); return; }
  const [campaign, defaultDateParts] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: ctx.campaignId },
      select: { currentEpochMinute: true },
    }),
    resolveCampaignChronologyNow(ctx.campaignId),
  ]);
  const viewerCtx = buildNarrativeViewerContext({
    role: audience.preview ? null : ctx.role ?? null,
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
    audience.preview ? null : ctx.role,
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
  const audience = resolveAdventureAudience(ctx, req.query.previewAsPlayer, null);
  const page = audience.preview
    ? (await filterAdventurePreviewPages(ctx.campaignId,
      await prisma.wikiPage.findMany({ where: { campaignId: ctx.campaignId, deletedAt: null } }), audience.canViewPage))
        .find(row => row.id === pageId)
    : await assertWikiPageInCampaign(ctx.campaignId, pageId);
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }
  const bundle = await listInterpretationBundle(ctx.campaignId, pageId, audience.preview ? null : ctx.role);
  if (audience.preview) {
    const claims = await listLoreClaims(ctx.campaignId, pageId, null);
    const groupIds = new Set([...bundle.accounts.map(account => account.interpretationGroupId),
      ...claims.map(claim => claim.interpretationGroupId)]);
    bundle.groups = bundle.groups.filter(group => groupIds.has(group.id));
  }
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
  const audience = resolveAdventureAudience(ctx, req.query.previewAsPlayer,
    await buildNarrativeViewerContextFromRequest(req));
  const visible = audience.preview ? await filterAdventurePreviewPages(ctx.campaignId,
    await prisma.wikiPage.findMany({ where: { campaignId: ctx.campaignId, deletedAt: null } }), audience.canViewPage) : null;
  const page = visible ? visible.find(row => row.id === pageId) : await assertWikiPageInCampaign(ctx.campaignId, pageId);
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }
  const claims = await listLoreClaims(ctx.campaignId, pageId, audience.preview ? null : ctx.role);
  if (visible) {
    const pageIds = new Set(visible.map(row => row.id));
    const [eventIds, sessionIds] = await Promise.all([
      visibleAdventureEventIds(ctx.campaignId, audience.canViewPage, audience.narrativeViewer),
      visibleAdventureSessionIds(ctx.campaignId, pageIds),
    ]);
    const sessionPages = await prisma.campaignSessionTimeline.findMany({
      where: { campaignId: ctx.campaignId, id: { in: [...sessionIds] } }, select: { wikiPageId: true },
    });
    for (const row of sessionPages) sessionIds.add(row.wikiPageId);
    const allowed = { pageIds, eventIds, sessionIds };
    for (const claim of claims) claim.sources = claim.sources.filter(source =>
      isVisibleAdventureKnowledgeSource(source, allowed));
  }
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
  const audience = resolveAdventureAudience(ctx, req.query.previewAsPlayer,
    await buildNarrativeViewerContextFromRequest(req));
  const visible = audience.preview ? await filterAdventurePreviewPages(ctx.campaignId,
    await prisma.wikiPage.findMany({ where: { campaignId: ctx.campaignId, deletedAt: null } }), audience.canViewPage) : null;
  const page = visible ? visible.find(row => row.id === pageId) : await assertWikiPageInCampaign(ctx.campaignId, pageId);
  if (!page) { res.status(404).json({ error: 'Page not found' }); return; }
  const knowledge = await buildPartyKnowledge(ctx.campaignId, pageId, audience.preview ? null : ctx.role);
  if (visible) {
    const ids = new Set(visible.map(row => row.id));
    const [eventIds, sessionIds] = await Promise.all([
      visibleAdventureEventIds(ctx.campaignId, audience.canViewPage, audience.narrativeViewer),
      visibleAdventureSessionIds(ctx.campaignId, ids),
    ]);
    const sessionPages = await prisma.campaignSessionTimeline.findMany({
      where: { campaignId: ctx.campaignId, id: { in: [...sessionIds] } }, select: { wikiPageId: true },
    });
    for (const row of sessionPages) sessionIds.add(row.wikiPageId);
    const allowedSources = { pageIds: ids, eventIds, sessionIds };
    const keepSource = (source: { sourceEntityId?: string | null;
      sourceEntityType?: string | null; sourceType?: string | null }) =>
      isVisibleAdventureKnowledgeSource(source, allowedSources);
    knowledge.claims = knowledge.claims.map(claim => ({ ...claim,
      sources: claim.sources.filter(keepSource) }));
    knowledge.groups = Object.fromEntries(Object.entries(knowledge.groups).map(([key, claims]) =>
      [key, claims.map(claim => {
        const sources = (claim as typeof claim & { sources?: typeof knowledge.claims[number]['sources'] }).sources;
        return sources ? { ...claim, sources: sources.filter(keepSource) } : claim;
      })])) as typeof knowledge.groups;
  }
  res.json({ knowledge, canonicalTitle: page.title });
}

export { NarrativeEventType, LORE_KNOWLEDGE_UPDATED };
