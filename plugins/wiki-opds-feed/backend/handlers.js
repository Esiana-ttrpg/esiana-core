import { buildWikiOpdsCatalogFeed } from './catalog.js';

function publicBaseUrl(req) {
  const host = req.get('host') ?? 'localhost';
  return `${req.protocol}://${host}`;
}

async function resolveCampaignForRequest(context, req, res) {
  const campaignSlug = String(req.params.campaignSlug ?? '').trim();
  if (!campaignSlug) {
    res.status(400).json({ error: 'Campaign slug is required' });
    return null;
  }

  const campaign = await context.publicWiki.resolveCampaignBySlug(campaignSlug);
  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return null;
  }

  if (!campaign.isPublicViewable) {
    res.status(404).json({ error: 'OPDS feed is not available for this campaign' });
    return null;
  }

  if (!(await context.isEnabledForCampaign(campaign.id))) {
    res.status(404).json({
      error: 'Wiki OPDS feed is disabled for this campaign',
      hint: 'Enable Wiki OPDS Feed in Campaign Settings → Campaign Plugins.',
    });
    return null;
  }

  return campaign;
}

export function createOpdsHandlers(context) {
  const pluginId = context.pluginId;

  return {
    async handleCatalog(req, res) {
      const campaign = await resolveCampaignForRequest(context, req, res);
      if (!campaign) return;

      const [pages, config] = await Promise.all([
        context.publicWiki.listPublicPages(campaign.id),
        context.getCampaignConfig(campaign.id),
      ]);

      const catalogTitleSuffix =
        typeof config.catalogTitleSuffix === 'string' ? config.catalogTitleSuffix : undefined;

      const feed = buildWikiOpdsCatalogFeed({
        pluginId,
        campaignSlug: campaign.slug,
        campaignName: campaign.name,
        campaignUpdatedAt: campaign.updatedAt,
        baseUrl: publicBaseUrl(req),
        catalogTitleSuffix,
        pages,
      });

      res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(context.feeds.buildOpdsAtom(feed));
    },

    async handlePageMarkdown(req, res) {
      const campaign = await resolveCampaignForRequest(context, req, res);
      if (!campaign) return;

      const pageId = String(req.params.pageId ?? '').trim();
      if (!pageId) {
        res.status(400).json({ error: 'Page id is required' });
        return;
      }

      const page = await context.publicWiki.getPublicPage(campaign.id, pageId);
      if (!page) {
        res.status(404).json({ error: 'Page not found' });
        return;
      }

      const markdown = context.publicWiki.pageToMarkdown(page);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${page.title.replace(/[^\w.-]+/g, '_')}.md"`,
      );
      res.send(markdown);
    },
  };
}
