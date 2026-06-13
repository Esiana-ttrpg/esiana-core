import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { normalizeAlias } from '../lib/normalizeAlias.js';
import { getWikiLinkIndexForViewer } from '../lib/wikiLinkIndexService.js';
import { resolveWikiCodexType } from '../lib/resolveWikiCodexType.js';
import {
  appendNarrativeEvent,
  getSpoilerSafeWorldActivitySummary,
  NarrativeEventType,
} from '../lib/narrativeEventService.js';
import {
  getVisibleInboundLinkCount,
} from '../lib/wikiPageSubstrateService.js';
import {
  isElevatedWikiRole,
  wikiLinkPeerVisibilityFilter,
} from '../lib/wikiLinkService.js';
import { extractMentionSnippetFromBlocks } from '../lib/sessionMentionSnippet.js';
import { canViewWikiPage } from '../lib/wikiTree.js';
import { WikiVisibility } from '../types/domain.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  buildGlobalContinuityPayload,
  buildPageContinuityPayload,
} from '../lib/wikiContinuityService.js';

export async function getMentionTargets(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const members = await prisma.campaignMember.findMany({
    where: { campaignId: ctx.campaignId },
    include: {
      user: { select: { id: true, displayName: true, email: true } },
      identityPage: { select: { id: true, title: true } },
    },
  });

  const targets: Array<{
    mentionType: string;
    label: string;
    targetUserId?: string;
    identityPageId?: string;
  }> = [];

  for (const m of members) {
    const userLabel =
      m.user.displayName?.trim() ||
      m.user.email.split('@')[0] ||
      'Player';
    targets.push({
      mentionType: 'USER',
      label: userLabel,
      targetUserId: m.user.id,
    });
    if (m.identityPage) {
      targets.push({
        mentionType: 'CHARACTER',
        label: m.identityPage.title,
        targetUserId: m.user.id,
        identityPageId: m.identityPage.id,
      });
    }
  }

  res.json({ targets });
}

export async function getWikiLinkIndex(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const entries = await getWikiLinkIndexForViewer({
    campaignId: ctx.campaignId,
    role: ctx.role,
  });
  res.json({ entries });
}

export async function getMentionSnippet(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const sourcePageId = String(req.params.pageId);
  const targetPageId =
    typeof req.query.targetPageId === 'string'
      ? req.query.targetPageId.trim()
      : '';

  if (!targetPageId) {
    res.status(400).json({ error: 'targetPageId required' });
    return;
  }

  const isElevated = isElevatedWikiRole(ctx.role);
  const peerFilter = wikiLinkPeerVisibilityFilter(isElevated);

  const source = await prisma.wikiPage.findFirst({
    where: {
      id: sourcePageId,
      campaignId: ctx.campaignId,
      deletedAt: null,
      ...(peerFilter ?? {}),
    },
    select: { id: true, visibility: true, blocks: true },
  });

  if (!source || !canViewWikiPage(source.visibility, ctx.role)) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  const blocks = (Array.isArray(source.blocks) ? source.blocks : []) as Array<
    Record<string, unknown>
  >;
  const snippet = extractMentionSnippetFromBlocks(blocks, targetPageId);

  res.json({ snippet });
}

export async function getWikiPagePreview(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);

  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId: ctx.campaignId, deletedAt: null },
    select: {
      id: true,
      title: true,
      visibility: true,
      templateType: true,
      updatedAt: true,
      metadata: true,
      stats: {
        select: {
          inboundLinkCount: true,
          wordCount: true,
        },
      },
      aliases: { select: { alias: true } },
    },
  });

  if (!page || !canViewWikiPage(page.visibility, ctx.role)) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  const visibleInbound = await getVisibleInboundLinkCount({
    targetPageId: page.id,
    campaignId: ctx.campaignId,
    role: ctx.role,
  });

  const metadata = page.metadata as Record<string, unknown> | null;
  const summary =
    typeof metadata?.summary === 'string'
      ? metadata.summary
      : typeof metadata?.description === 'string'
        ? metadata.description
        : null;

  const codexType = resolveWikiCodexType({
    templateType: page.templateType,
    metadata: page.metadata,
  });

  res.json({
    preview: {
      id: page.id,
      title: page.title,
      templateType: page.templateType,
      codexType,
      visibility: page.visibility,
      updatedAt: page.updatedAt.toISOString(),
      aliases: page.aliases.map((a) => a.alias),
      summary,
      inboundLinkCount: visibleInbound,
      wordCount: page.stats?.wordCount ?? 0,
    },
  });
}

export async function getUnresolvedWikilinks(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const isElevated = isElevatedWikiRole(ctx.role);
  const peerFilter = wikiLinkPeerVisibilityFilter(isElevated);

  const sourcePageId =
    typeof req.query.sourcePageId === 'string'
      ? req.query.sourcePageId.trim()
      : '';
  const scopeCampaign = req.query.scope === 'campaign';

  const rows = await prisma.unresolvedWikilink.findMany({
    where: {
      campaignId: ctx.campaignId,
      status: req.query.status === 'all' ? undefined : 'OPEN',
      ...(sourcePageId && !scopeCampaign ? { sourcePageId } : {}),
      sourcePage: peerFilter ? { ...peerFilter, deletedAt: null } : { deletedAt: null },
    },
    include: {
      sourcePage: { select: { id: true, title: true, visibility: true } },
    },
    orderBy: { lastSeenAt: 'desc' },
    take: 200,
  });

  res.json({
    unresolved: rows.map((row) => ({
      id: row.id,
      sourcePageId: row.sourcePageId,
      sourcePageTitle: row.sourcePage.title,
      rawText: row.rawText,
      normalizedText: row.normalizedText,
      occurrenceCount: row.occurrenceCount,
      status: row.status,
      lastSeenAt: row.lastSeenAt.toISOString(),
    })),
  });
}

export async function ignoreUnresolvedWikilink(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const id = String(req.params.id);

  const row = await prisma.unresolvedWikilink.findFirst({
    where: { id, campaignId: ctx.campaignId },
  });
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  await prisma.unresolvedWikilink.update({
    where: { id },
    data: {
      status: 'IGNORED',
      ignoredByUserId: req.user?.id ?? null,
      ignoredAt: new Date(),
    },
  });

  res.json({ ok: true });
}

export async function mergeUnresolvedWikilinks(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const { normalizedTexts, targetPageId } = req.body as {
    normalizedTexts?: string[];
    targetPageId?: string;
  };

  if (!Array.isArray(normalizedTexts) || !targetPageId) {
    res.status(400).json({ error: 'normalizedTexts and targetPageId required' });
    return;
  }

  const target = await prisma.wikiPage.findFirst({
    where: { id: targetPageId, campaignId: ctx.campaignId, deletedAt: null },
    select: { id: true, title: true },
  });
  if (!target) {
    res.status(404).json({ error: 'Target page not found' });
    return;
  }

  await prisma.unresolvedWikilink.updateMany({
    where: {
      campaignId: ctx.campaignId,
      normalizedText: { in: normalizedTexts.map((t) => normalizeAlias(t)) },
      status: 'OPEN',
    },
    data: { status: 'RESOLVED' },
  });

  if (req.user?.id) {
    await appendNarrativeEvent(prisma, {
      campaignId: ctx.campaignId,
      type: NarrativeEventType.STUB_RESOLVED,
      source: 'user',
      actorUserId: req.user.id,
      pageId: target.id,
      metadata: { normalizedTexts },
    });
  }

  res.json({ ok: true, targetPageId: target.id, title: target.title });
}

export async function getWikiPageContinuity(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);

  const payload = await buildPageContinuityPayload({
    campaignId: ctx.campaignId,
    pageId,
    role: ctx.role,
  });

  if (!payload) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  res.json(payload);
}

export async function getWikiContinuitySummary(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;

  const payload = await buildGlobalContinuityPayload({
    campaignId: ctx.campaignId,
    role: ctx.role,
  });

  res.json(payload);
}

export async function getWorldActivitySummary(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const summary = await getSpoilerSafeWorldActivitySummary(
    ctx.campaignId,
    since,
  );

  res.json({
    periodDays: days,
    ...summary,
    message: `${summary.pagesEdited} lore pages expanded · ${summary.linksCreated} new connections · ${summary.stubsResolved} references resolved`,
  });
}

export async function getWritingPulse(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const edits = await prisma.narrativeEvent.count({
    where: {
      campaignId: ctx.campaignId,
      actorUserId: userId,
      type: NarrativeEventType.PAGE_EDITED,
      createdAt: { gte: since },
    },
  });

  const pagesTouched = await prisma.wikiPageStats.findMany({
    where: {
      campaignId: ctx.campaignId,
      lastEditedByUserId: userId,
      lastEditedAt: { gte: since },
    },
    select: {
      pageId: true,
      wordCount: true,
      lastEditedAt: true,
      page: { select: { title: true } },
    },
    orderBy: { lastEditedAt: 'desc' },
    take: 20,
  });

  const totalWords = pagesTouched.reduce((sum, p) => sum + p.wordCount, 0);

  res.json({
    periodDays: days,
    pagesEdited: edits,
    totalWordsInTouchedPages: totalWords,
    recentlyTouched: pagesTouched.map((p) => ({
      pageId: p.pageId,
      title: p.page.title,
      wordCount: p.wordCount,
      lastEditedAt: p.lastEditedAt.toISOString(),
    })),
  });
}

export async function listWikiPageAliases(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const pageId = String(req.params.pageId);
  const ctx = req.campaign!;

  const aliases = await prisma.wikiPageAlias.findMany({
    where: { pageId, campaignId: ctx.campaignId },
    orderBy: { alias: 'asc' },
  });

  res.json({ aliases });
}

export async function createWikiPageAlias(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const pageId = String(req.params.pageId);
  const { alias } = req.body as { alias?: string };

  if (!alias?.trim()) {
    res.status(400).json({ error: 'alias required' });
    return;
  }

  const page = await prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId: ctx.campaignId, deletedAt: null },
  });
  if (!page) {
    res.status(404).json({ error: 'Page not found' });
    return;
  }

  const normalizedAlias = normalizeAlias(alias);
  if (!normalizedAlias) {
    res.status(400).json({ error: 'Invalid alias' });
    return;
  }

  try {
    const created = await prisma.wikiPageAlias.create({
      data: {
        campaignId: ctx.campaignId,
        pageId,
        alias: alias.trim(),
        normalizedAlias,
      },
    });
    if (req.user?.id) {
      await appendNarrativeEvent(prisma, {
        campaignId: ctx.campaignId,
        type: NarrativeEventType.ALIAS_ADDED,
        source: 'user',
        actorUserId: req.user.id,
        pageId,
        metadata: { alias: created.alias, aliasId: created.id },
      });
    }
    res.status(201).json({ alias: created });
  } catch {
    res.status(409).json({ error: 'Alias already exists in this campaign' });
  }
}

export async function deleteWikiPageAlias(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const aliasId = String(req.params.aliasId);

  await prisma.wikiPageAlias.deleteMany({
    where: { id: aliasId, campaignId: ctx.campaignId },
  });

  res.json({ ok: true });
}
