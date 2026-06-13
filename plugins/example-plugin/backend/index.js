/**
 * Reference plugin — demonstrates Pre-1.0 platform APIs.
 */
export function register(router, context) {
  router.get('/hello', (_req, res) => {
    res.json({ message: 'Hello from example-plugin' });
  });

  router.post('/echo', (req, res) => {
    void context.data.set('lastEcho', req.body ?? {});
    res.json({ ok: true, echo: req.body ?? {} });
  });

  context.registerImportProvider({
    id: 'demo-import',
    label: 'Example Import',
    description: 'Reference import provider stub for wizard listing',
    requiresFile: false,
    async validate() {},
    async import() {
      return { ok: true };
    },
  });

  context.registerSearchCollection({
    id: 'demo',
    label: 'Example',
    async search(query, { campaignId }) {
      if (!query.includes('demo')) return [];
      const value = await context.data.get('demoSearchLabel');
      return [
        {
          id: 'demo-hit',
          title: typeof value === 'string' ? value : 'Demo Result',
          subtitle: 'Plugin: Example',
          pageId: 'demo',
        },
      ];
    },
  });

  if (context.manifestPermissions.includes('data:interceptor')) {
    context.registerDataInterceptor({
      entity: 'wikiPage',
      phase: 'beforeCreate',
      scriptPath: 'hooks/wiki-page-before-create.js',
    });
  }
}
