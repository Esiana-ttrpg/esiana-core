export function register(router) {
  router.get('/status', (_req, res) => {
    res.json({ status: 'stub', message: 'Foundry VTT sync integration is not implemented yet.' });
  });
}
