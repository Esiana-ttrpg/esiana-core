import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { EraError, listChronologyEras, saveChronologyEra, reorderChronologyEras, chronologyEraImpact, deleteChronologyEra } from '../lib/chronologyEraService.js';

function handler(action: (req: CampaignScopedRequest, res: Response) => Promise<void>) {
  return async (req: CampaignScopedRequest, res: Response) => {
    try { await action(req, res); }
    catch (error) {
      if (error instanceof EraError) res.status(error.status).json({ error: error.message });
      else throw error;
    }
  };
}
export const listEras = handler(async (req, res) => { res.json({ eras: await listChronologyEras(req.campaign!) }); });
export const createEra = handler(async (req, res) => {
  const id = await saveChronologyEra(req.campaign!, req.body ?? {}, req.user?.id);
  res.status(201).json({ era: (await listChronologyEras(req.campaign!)).find(era => era.id === id) });
});
export const updateEra = handler(async (req, res) => {
  const id = await saveChronologyEra(req.campaign!, req.body ?? {}, req.user?.id, String(req.params.eraId));
  res.json({ era: (await listChronologyEras(req.campaign!)).find(era => era.id === id) });
});
export const reorderEras = handler(async (req, res) => {
  await reorderChronologyEras(req.campaign!, req.body?.calendarId, req.body?.ids);
  res.json({ eras: await listChronologyEras(req.campaign!) });
});
export const eraImpact = handler(async (req, res) => { res.json(await chronologyEraImpact(req.campaign!, String(req.params.eraId))); });
export const deleteEra = handler(async (req, res) => {
  if (req.body?.confirmed !== true) throw new EraError('Confirm deletion of the era and its Overview.');
  await deleteChronologyEra(req.campaign!, String(req.params.eraId));
  res.status(204).end();
});
