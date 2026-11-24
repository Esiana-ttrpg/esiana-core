import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from './auth.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { serializeUserIdentity } from '../lib/userDisplay.js';
import { hashReaderSecret, OPDS_SCOPE, parseReaderSecret } from '../lib/opds/credentials.js';

/** Dedicated reader authentication; never delegates reader secrets to API auth. */
export async function requireReaderAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  res.setHeader('Cache-Control', 'private, no-store');
  res.vary('Authorization');
  const secret = parseReaderSecret(req.headers.authorization);
  const record = secret ? await prisma.userToken.findFirst({
    where: { tokenHash: hashReaderSecret(secret, env.jwtSecret), expiresAt: { gt: new Date() } },
    include: { user: true },
  }) : null;
  if (!record || !Array.isArray(record.scopes) || record.scopes.length !== 1 || record.scopes[0] !== OPDS_SCOPE) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Esiana OPDS", charset="UTF-8"');
    res.status(401).type('application/opds-authentication+json').json({ id: 'urn:esiana:opds:authentication',
      title: 'Esiana reader credential required', authentication: [{ type: 'http://opds-spec.org/auth/basic',
        labels: { login: 'Reader', password: 'Reader credential' } }] });
    return;
  }
  req.user = serializeUserIdentity(record.user);
  req.apiTokenId = record.id;
  req.isApiTokenRequest = true;
  req.authMethod = 'apiToken';
  req.apiTokenScopes = [OPDS_SCOPE];
  // Conditional update tolerates concurrent revocation without recreating a credential.
  const touched = await prisma.userToken.updateMany({ where: { id: record.id, expiresAt: { gt: new Date() } }, data: { lastUsedAt: new Date() } });
  if (!touched.count) { res.sendStatus(401); return; }
  next();
}
