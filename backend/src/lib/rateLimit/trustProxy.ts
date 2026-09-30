import type { Express } from 'express';
import { env } from '../../config/env.js';

/**
 * Configure Express to honor `X-Forwarded-For` from a single trusted hop
 * when `TRUST_PROXY=true`. Rate-limit IP buckets use `req.ip`, which
 * depends on this setting.
 */
export function configureTrustProxy(app: Express): void {
  if (env.trustProxy) {
    app.set('trust proxy', 1);
  }
}
