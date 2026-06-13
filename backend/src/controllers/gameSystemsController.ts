import type { Request, Response } from 'express';
import { GAME_SYSTEMS } from '../lib/gameSystems.js';

export async function listGameSystems(_req: Request, res: Response): Promise<void> {
  res.json({ systems: GAME_SYSTEMS });
}
