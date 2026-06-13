import assert from 'node:assert/strict';
import test from 'node:test';
import type { Response } from 'express';
import { requireTokenScopes } from './auth.js';
import type { AuthenticatedRequest } from './auth.js';
import { API_TOKEN_SCOPES } from '../lib/apiToken.js';

function mockRes(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as Response & { statusCode: number; body: unknown };
}

test('requireTokenScopes bypasses session auth', () => {
  const req = { authMethod: 'session' } as AuthenticatedRequest;
  const res = mockRes();
  let nextCalled = false;
  requireTokenScopes([API_TOKEN_SCOPES.PLUGINS_MANAGE])(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('requireTokenScopes rejects bearer without required scope', () => {
  const req = {
    authMethod: 'apiToken',
    apiTokenScopes: [API_TOKEN_SCOPES.PLUGINS_READ],
  } as AuthenticatedRequest;
  const res = mockRes();
  let nextCalled = false;
  requireTokenScopes([API_TOKEN_SCOPES.PLUGINS_MANAGE])(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test('requireTokenScopes allows legacy bearer with empty scopes', () => {
  const req = {
    authMethod: 'apiToken',
    apiTokenScopes: [],
  } as AuthenticatedRequest;
  const res = mockRes();
  let nextCalled = false;
  requireTokenScopes([API_TOKEN_SCOPES.PLUGINS_MANAGE])(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
});
