const PLUGIN_ID = 'player-journal';

function journalKey(userId) {
  return `journal:${userId}`;
}

function parseEntries(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const list = raw.entries;
  return Array.isArray(list) ? list : [];
}

export function register(router, context) {
  router.get('/entries', async (req, res) => {
    const campaignId = req.query.campaignId;
    const userId = req.user?.id;
    if (!campaignId || !userId) {
      res.status(400).json({ error: 'campaignId required' });
      return;
    }
    if (!(await context.isEnabledForCampaign(String(campaignId)))) {
      res.status(403).json({ error: 'Plugin not enabled for campaign' });
      return;
    }
    const data = context.createPluginDataService(String(campaignId));
    const raw = await data.get(journalKey(userId));
    res.json({ entries: parseEntries(raw) });
  });

  router.put('/entries', async (req, res) => {
    const { campaignId, entries } = req.body ?? {};
    const userId = req.user?.id;
    if (!campaignId || !userId || !Array.isArray(entries)) {
      res.status(400).json({ error: 'campaignId and entries[] required' });
      return;
    }
    if (!(await context.isEnabledForCampaign(String(campaignId)))) {
      res.status(403).json({ error: 'Plugin not enabled for campaign' });
      return;
    }
    const data = context.createPluginDataService(String(campaignId));
    await data.set(journalKey(userId), {
      entries,
      updatedAt: new Date().toISOString(),
    });
    res.json({ ok: true, count: entries.length });
  });

  router.post('/entries/:entryId/published', async (req, res) => {
    const { campaignId, wikiPageId } = req.body ?? {};
    const userId = req.user?.id;
    const entryId = String(req.params.entryId);
    if (!campaignId || !userId || !wikiPageId) {
      res.status(400).json({ error: 'campaignId and wikiPageId required' });
      return;
    }
    if (!(await context.isEnabledForCampaign(String(campaignId)))) {
      res.status(403).json({ error: 'Plugin not enabled for campaign' });
      return;
    }
    const data = context.createPluginDataService(String(campaignId));
    const raw = await data.get(journalKey(userId));
    const entries = parseEntries(raw);
    const idx = entries.findIndex((e) => e?.id === entryId);
    if (idx >= 0) {
      entries[idx] = { ...entries[idx], publishedWikiPageId: wikiPageId, publishedAt: new Date().toISOString() };
      await data.set(journalKey(userId), { entries, updatedAt: new Date().toISOString() });
    }
    context.emitDomainEvent(
      `${PLUGIN_ID}:entry:published`,
      { entryId, wikiPageId, userId },
      String(campaignId),
    );
    res.json({ ok: true });
  });
}
