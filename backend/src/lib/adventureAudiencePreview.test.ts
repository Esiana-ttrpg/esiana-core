import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rejectUnverifiedAudiencePreview } from './adventureAudiencePreview.js';
import type { Response } from 'express';

test('unverified preview requests fail closed for elevated users', () => {
  for (const query of ['true', '1']) {
    let code = 0;
    let body: unknown;
    const response = { status(value: number) { code = value; return this; }, json(value: unknown) { body = value; return this; } };
    assert.equal(rejectUnverifiedAudiencePreview(query, true, response as unknown as Response), true);
    assert.equal(code, 503);
    assert.deepEqual(body, { error: 'Audience preview is temporarily unavailable.' });
  }
});

test('ordinary access and non-preview requests are unaffected', () => {
  const response = { status() { throw new Error('unexpected response'); } } as unknown as Response;
  assert.equal(rejectUnverifiedAudiencePreview('true', false, response), false);
  assert.equal(rejectUnverifiedAudiencePreview(undefined, true, response), false);
  assert.equal(rejectUnverifiedAudiencePreview('false', true, response), false);
});
