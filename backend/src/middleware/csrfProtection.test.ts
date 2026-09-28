import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { csrfProtection, isAllowedCsrfOrigin } from './csrfProtection.js';

function run(input: { method: string; origin?: string; cookie?: boolean; authorization?: string }) {
  let nextCalled = false;
  let status = 200;
  let body: unknown;
  const req = {
    method: input.method,
    headers: { origin: input.origin, authorization: input.authorization },
    cookies: input.cookie ? { [env.cookieName]: 'session' } : {},
  } as unknown as Request;
  const res = {
    status(value: number) { status = value; return this; },
    json(value: unknown) { body = value; return this; },
  } as unknown as Response;
  csrfProtection(req, res, (() => { nextCalled = true; }) as NextFunction);
  return { nextCalled, status, body };
}

test('allows safe requests and explicit bearer authentication', () => {
  assert.equal(run({ method: 'GET', cookie: true }).nextCalled, true);
  assert.equal(run({ method: 'POST', authorization: 'Bearer token' }).nextCalled, true);
});

test('allows the configured frontend origin for cookie mutations', () => {
  assert.equal(isAllowedCsrfOrigin(env.frontendOrigin), true);
  assert.equal(run({ method: 'PATCH', cookie: true, origin: env.frontendOrigin }).nextCalled, true);
});

test('rejects missing or cross-site origins when ambient credentials are present', () => {
  assert.equal(run({ method: 'POST', cookie: true }).status, 403);
  assert.equal(run({ method: 'DELETE', cookie: true, origin: 'https://attacker.example' }).status, 403);
  assert.equal(run({ method: 'POST', cookie: true, authorization: 'Bearer token' }).status, 403);
});

test('rejects browser cross-origin mutations even before login', () => {
  const result = run({ method: 'POST', origin: 'https://attacker.example' });
  assert.equal(result.nextCalled, false);
  assert.equal(result.status, 403);
});
