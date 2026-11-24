import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { getOrCreateSystemSettings } from '../lib/systemSettings.js';
import { requireReaderAuth } from '../middleware/opdsAuth.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';
import { buildCampaignContext } from '../lib/campaignScopeContext.js';
import { resolveAdventureAudience } from '../lib/adventureAudience.js';
import { projectAdventurePages } from '../lib/adventurePageProjection.js';
import { hasElevatedNarrativeView } from '../lib/acl.js';
import { buildOpdsFeed, OPDS_MEDIA_TYPE, pageToPublication } from '../lib/opds/feed.js';
import { stripMarkdownToPlain } from '../lib/wikiExcerpt.js';
import { renderReadingPage } from '../lib/opds/reading.js';
import { buildWikiPageHref } from '../lib/wikiLinkService.js';

export const opdsRouter = Router({ caseSensitive: true });
opdsRouter.use(rateLimitPolicy('public'));
opdsRouter.use(async (req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const settings = await getOrCreateSystemSettings();
  const personal = req.path === '/me' || req.path.startsWith('/me/');
  if (!settings.opdsEnabled || (personal ? !settings.opdsPersonalEnabled :
    !settings.opdsPublicEnabled || settings.requireLogin)) {
    res.sendStatus(404); return;
  }
  if (!personal && req.path.startsWith('/recruiting') && !settings.opdsRecruitingEnabled) { res.sendStatus(404); return; }
  if (!personal && req.path.startsWith('/campaigns') && !settings.opdsCampaignsEnabled) { res.sendStatus(404); return; }
  next();
});
opdsRouter.use('/me', requireReaderAuth, rateLimitPolicy('authenticated'), rateLimitPolicy('apiKey'));

opdsRouter.get('/', async (_req, res) => {
  const s = await getOrCreateSystemSettings();
  res.type(OPDS_MEDIA_TYPE).json(buildOpdsFeed({ title: 'Esiana Campaign Catalog',
    links: [{ href: '/opds', rel: 'self', type: OPDS_MEDIA_TYPE }], navigation: [
      ...(s.opdsRecruitingEnabled ? [{ href: '/opds/recruiting', title: 'Recruiting', type: OPDS_MEDIA_TYPE }] : []),
      ...(s.opdsCampaignsEnabled ? [{ href: '/opds/campaigns', title: 'Public Campaigns', type: OPDS_MEDIA_TYPE }] : []),
      ...(s.opdsPersonalEnabled ? [{ href: '/opds/me', title: 'My Campaigns', type: OPDS_MEDIA_TYPE }] : []),
    ] }));
});

opdsRouter.get(['/recruiting', '/recruiting/:id', '/recruiting/:id/manifest.json'], async (req, res) => {
  const where = { discoverability: 'public', isLookingForGroup: true };
  if (req.params.id) {
    const row = await prisma.campaign.findFirst({ where: { ...where, id: String(req.params.id) },
      select: { id: true, name: true, handle: true, recruitmentTagline: true, recruitmentPremise: true } });
    if (!row) { res.sendStatus(404); return; }
    if (req.path.endsWith('/manifest.json')) {
      res.type('application/webpub+json').json({ '@context': 'https://readium.org/webpub-manifest/context.jsonld',
        metadata: { '@type': 'http://schema.org/Book', identifier: `urn:esiana:recruiting:${row.id}`, title: row.name, language: 'en' },
        links: [{ href: `/opds/recruiting/${row.id}/manifest.json`, rel: 'self', type: 'application/webpub+json' }],
        readingOrder: [{ href: `/opds/recruiting/${row.id}`, type: 'text/html', title: row.name }] }); return;
    }
    res.setHeader('Content-Security-Policy', "default-src 'none'; base-uri 'none'; form-action 'none'");
    res.type('html').send(renderReadingPage({ title: row.name, blocks: [
      { type: 'text-biography', content: { markdown: row.recruitmentTagline ?? '' } },
      { type: 'text-tiptap', content: { markdown: row.recruitmentPremise ?? '' } },
    ] }, `/recruitment/${row.handle}`)); return;
  }
  const page = Math.max(1, Math.min(10000, Number.parseInt(String(req.query.page), 10) || 1));
  const rows = await prisma.campaign.findMany({ where, select: { id: true, name: true, handle: true, recruitmentTagline: true, updatedAt: true },
    orderBy: { id: 'asc' }, take: 31, skip: (page - 1) * 30 });
  res.type(OPDS_MEDIA_TYPE).json(buildOpdsFeed({ title: 'Recruiting', links: [
    { href: `/opds/recruiting?page=${page}`, rel: 'self', type: OPDS_MEDIA_TYPE },
    ...(rows.length > 30 ? [{ href: `/opds/recruiting?page=${page + 1}`, rel: 'next', type: OPDS_MEDIA_TYPE }] : []),
  ], publications: rows.slice(0, 30).map(row => pageToPublication({ id: `urn:esiana:recruiting:${row.id}`, title: row.name,
    modified: row.updatedAt, description: row.recruitmentTagline,
    reading: { href: `/opds/recruiting/${row.id}/manifest.json`, type: 'application/webpub+json' }, canonical: { href: `/recruitment/${row.handle}`, type: 'text/html' } })) }));
});

opdsRouter.get(['/me', '/campaigns'], async (req: AuthenticatedRequest, res) => {
  const personal = /^\/me\/?$/.test(req.path);
  const base = personal ? '/opds/me' : '/opds/campaigns';
  const page = Math.max(1, Math.min(10000, Number.parseInt(String(req.query.page), 10) || 1));
  const where = personal ? { members: { some: { userId: req.user!.id } } } : { discoverability: 'public' };
  const settings = await getOrCreateSystemSettings();
  if (!personal && !settings.opdsCampaignsEnabled) {
    res.type(OPDS_MEDIA_TYPE).json(buildOpdsFeed({ title: 'Esiana', links: [], navigation: [] })); return;
  }
  const rows = await prisma.campaign.findMany({ where, select: { id: true, name: true },
    orderBy: { id: 'asc' }, skip: (page - 1) * 30, take: 31 });
  res.type(OPDS_MEDIA_TYPE).json(buildOpdsFeed({ title: personal ? 'My Campaigns' : 'Public Campaigns',
    links: [{ href: `${base}?page=${page}`, rel: 'self', type: OPDS_MEDIA_TYPE },
      ...(rows.length > 30 ? [{ href: `${base}?page=${page + 1}`, rel: 'next', type: OPDS_MEDIA_TYPE }] : [])],
    navigation: rows.slice(0, 30).map(row => ({ href: `${base}/${row.id}`, title: row.name, type: OPDS_MEDIA_TYPE })) }));
});

opdsRouter.get(['/me/:id', '/campaigns/:id', '/me/:id/:module', '/campaigns/:id/:module',
  '/me/:id/pages/:pageId', '/campaigns/:id/pages/:pageId',
  '/me/:id/pages/:pageId/manifest.json', '/campaigns/:id/pages/:pageId/manifest.json'], async (req: AuthenticatedRequest, res) => {
  const personal = req.path.startsWith('/me/');
  const campaign = await prisma.campaign.findUnique({ where: { id: String(req.params.id) } });
  if (!campaign || (!personal && campaign.discoverability !== 'public')) { res.sendStatus(404); return; }
  const membership = personal ? await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId: req.user!.id, campaignId: campaign.id } } }) : null;
  if (personal && !membership) { res.sendStatus(404); return; }
  const context = await buildCampaignContext({ campaignId: campaign.id, campaignHandle: campaign.handle,
    campaignOwnerUserId: campaign.campaignOwnerUserId, discoverability: campaign.discoverability,
    allowPlayerChronologyManagement: campaign.allowPlayerChronologyManagement,
    userId: personal ? req.user!.id : null, membershipRole: membership?.role ?? null,
    partyId: membership?.partyId, chronologyContributor: membership?.chronologyContributor });
  const audience = resolveAdventureAudience(context, undefined, null);
  const summaries = await prisma.wikiPage.findMany({ where: { campaignId: campaign.id, deletedAt: null }, orderBy: { id: 'asc' },
    select: { id: true, title: true, parentId: true, visibility: true, metadata: true, workspace: true, pathKey: true, templateType: true, updatedAt: true } });
  const detail = req.params.pageId ? await prisma.wikiPage.findFirst({ where: { campaignId: campaign.id, id: String(req.params.pageId), deletedAt: null }, select: { id: true, visibility: true, blocks: true } }) : null;
  const source = summaries.map(row => ({ ...row, visibility: detail?.id === row.id ? detail.visibility : row.visibility,
    blocks: detail?.id === row.id ? detail.blocks : [] }));
  const pages = hasElevatedNarrativeView(context.actor) ? source : await projectAdventurePages(campaign.id, source, audience.canViewPage);
  const base = `/opds/${personal ? 'me' : 'campaigns'}/${campaign.id}`;
  if (req.params.pageId) {
    const row = pages.find(page => page.id === req.params.pageId);
    if (!row) { res.sendStatus(404); return; }
    if (req.path.endsWith('/manifest.json')) {
      res.type('application/webpub+json').json({ '@context': 'https://readium.org/webpub-manifest/context.jsonld',
        metadata: { '@type': 'http://schema.org/Book', identifier: row.id, title: row.title, modified: row.updatedAt.toISOString(), language: 'en' },
        links: [{ href: `${base}/pages/${row.id}/manifest.json`, rel: 'self', type: 'application/webpub+json' }],
        readingOrder: [{ href: `${base}/pages/${row.id}`, type: 'text/html', title: row.title }] }); return;
    }
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'none'; base-uri 'none'; form-action 'none'");
    res.type('html').send(renderReadingPage(row, buildWikiPageHref(campaign.handle, row)));
    return;
  }
  if (!req.params.module) {
    const modules = [...new Set(pages.map(page => page.workspace ?? 'wiki'))].sort();
    res.type(OPDS_MEDIA_TYPE).json(buildOpdsFeed({ title: campaign.name, description: campaign.description, links: [{ href: base, rel: 'self', type: OPDS_MEDIA_TYPE }], navigation:
      modules.map(module => ({ href: `${base}/${encodeURIComponent(module)}`, title: module, type: OPDS_MEDIA_TYPE })) })); return;
  }
  const page = Math.max(1, Math.min(10000, Number.parseInt(String(req.query.page), 10) || 1));
  const rows = pages.filter(row => (row.workspace ?? 'wiki') === req.params.module);
  res.type(OPDS_MEDIA_TYPE).json(buildOpdsFeed({ title: `${campaign.name} / ${req.params.module}`,
    numberOfItems: rows.length, itemsPerPage: 30, currentPage: page, links: [
      { href: `${base}/${encodeURIComponent(String(req.params.module))}?page=${page}`, rel: 'self', type: OPDS_MEDIA_TYPE },
      ...(page * 30 < rows.length ? [{ href: `${base}/${encodeURIComponent(String(req.params.module))}?page=${page + 1}`, rel: 'next', type: OPDS_MEDIA_TYPE }] : [])],
    publications: rows.slice((page - 1) * 30, page * 30).map(row => pageToPublication({
      id: row.id, title: row.title, modified: row.updatedAt,
      description: stripMarkdownToPlain(typeof (row.metadata as Record<string, unknown> | null)?.description === 'string' ? String((row.metadata as Record<string, unknown>).description) : ''),
      category: String(req.params.module), reading: { href: `${base}/pages/${row.id}/manifest.json`, type: 'application/webpub+json' },
      canonical: { href: buildWikiPageHref(campaign.handle, row), type: 'text/html' },
    })) }));
});
