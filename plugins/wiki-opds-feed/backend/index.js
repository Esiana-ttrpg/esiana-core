/**
 * Wiki OPDS feed — campaign-scoped plugin with public OPDS 1.2 Atom routes.
 * Routes mount at /api/public/plugin-runtime/wiki-opds-feed/campaigns/:campaignHandle/opds/*
 */
import { createOpdsHandlers } from './handlers.js';
import { publicCatalogUrl } from './catalog.js';

export function register(router, context) {
  const handlers = createOpdsHandlers(context);

  context.registerPublicRoutes((publicRouter) => {
    publicRouter.get('/campaigns/:campaignHandle/opds/catalog.atom', handlers.handleCatalog);
    publicRouter.get('/campaigns/:campaignHandle/opds/pages/:pageId.md', handlers.handlePageMarkdown);
  });

  router.get('/info', (_req, res) => {
    res.json({
      plugin: 'wiki-opds-feed',
      scope: 'campaign',
      publicCatalogPath:
        '/api/public/plugin-runtime/wiki-opds-feed/campaigns/:campaignHandle/opds/catalog.atom',
      requires: [
        'Plugin installed and enabled in Campaign Settings → Campaign Plugins',
        'Campaign is public viewable',
        'Wiki pages with visibility Public',
      ],
    });
  });
}

export { publicCatalogUrl };
