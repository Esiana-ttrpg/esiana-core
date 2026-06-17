import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  checkSystemVersion,
  type VersionCheckResult,
} from './systemController.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restoreAll();
});

function invokeCheckSystemVersion(): Promise<VersionCheckResult> {
  return new Promise((resolve) => {
    const res = {
      json: (data: VersionCheckResult) => {
        resolve(data);
      },
    } as Response;
    void checkSystemVersion({} as AuthenticatedRequest, res);
  });
}

test('checkSystemVersion returns changelog when remote is newer', async () => {
  globalThis.fetch = mock.fn(async () => ({
    status: 200,
    ok: true,
    json: async () => ({
      tag_name: 'v99.0.0',
      body: '## Release notes\n\nBig update.',
      html_url: 'https://github.com/Esiana-ttrpg/esiana-core/releases/tag/v99.0.0',
    }),
  })) as typeof fetch;

  const payload = await invokeCheckSystemVersion();

  assert.equal(payload.isUpdateAvailable, true);
  assert.equal(payload.latestVersion, 'v99.0.0');
  assert.equal(payload.changelog, '## Release notes\n\nBig update.');
  assert.equal(
    payload.htmlUrl,
    'https://github.com/Esiana-ttrpg/esiana-core/releases/tag/v99.0.0',
  );
});

test('checkSystemVersion omits changelog when up to date', async () => {
  globalThis.fetch = mock.fn(async () => ({
    status: 200,
    ok: true,
    json: async () => ({
      tag_name: 'v0.0.1',
      body: 'Old release notes',
      html_url: 'https://github.com/Esiana-ttrpg/esiana-core/releases/tag/v0.0.1',
    }),
  })) as typeof fetch;

  const payload = await invokeCheckSystemVersion();

  assert.equal(payload.isUpdateAvailable, false);
  assert.equal(payload.changelog, null);
});
