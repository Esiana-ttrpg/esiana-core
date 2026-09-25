import express, { Router } from 'express';
import { env } from '../config/env.js';
import { createHash } from 'node:crypto';

export const pluginConnectionFixturesRouter = Router();
pluginConnectionFixturesRouter.use((_req, res, next) => {
  if (env.nodeEnv === 'production') { res.status(404).end(); return; }
  next();
});
pluginConnectionFixturesRouter.use(express.urlencoded({ extended: false }));

pluginConnectionFixturesRouter.get('/oauth/authorize', (req, res) => {
  const redirectUri = String(req.query.redirect_uri ?? '');
  const state = String(req.query.state ?? '');
  if (!redirectUri || !state || req.query.code_challenge_method !== 'S256') { res.status(400).send('invalid fixture authorization request'); return; }
  const target = new URL(redirectUri); target.searchParams.set('state', state); target.searchParams.set('code', `fixture-code:${String(req.query.code_challenge ?? '')}`); res.redirect(target.toString());
});

pluginConnectionFixturesRouter.post('/oauth/token', (req, res) => {
  const grant = String(req.body.grant_type ?? '');
  const verifierChallenge = createHash('sha256').update(String(req.body.code_verifier ?? '')).digest('base64url');
  if (grant === 'authorization_code' && req.body.code === `fixture-code:${verifierChallenge}`) {
    res.json({ access_token: 'fixture-oauth-access', refresh_token: 'fixture-oauth-refresh', token_type: 'Bearer', expires_in: 2, scope: 'library.read' }); return;
  }
  if (grant === 'refresh_token' && req.body.refresh_token === 'fixture-oauth-refresh') {
    res.json({ access_token: 'fixture-oauth-access-refreshed', refresh_token: 'fixture-oauth-refresh', token_type: 'Bearer', expires_in: 3600, scope: 'library.read' }); return;
  }
  res.status(400).json({ error: 'invalid_grant' });
});

pluginConnectionFixturesRouter.post('/oauth/revoke', (_req, res) => res.status(200).end());
pluginConnectionFixturesRouter.get('/oauth/library', (req, res) => {
  if (!String(req.headers.authorization ?? '').startsWith('Bearer fixture-oauth-access')) { res.status(401).json({ error: 'unauthorized' }); return; }
  res.json({ books: [{ id: 'fixture-book', title: 'The Moonlit Archive' }] });
});
pluginConnectionFixturesRouter.get('/api-key/library', (req, res) => {
  if (req.headers['x-api-key'] !== 'fixture-api-key') { res.status(401).json({ error: 'unauthorized' }); return; }
  res.json({ books: [{ id: 'fixture-key-book', title: 'Aster’s Field Notes' }] });
});
