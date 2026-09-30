import { Router } from 'express';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';

export const healthRouter = Router();

healthRouter.use(rateLimitPolicy('public'));

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'esiana-api' });
});
