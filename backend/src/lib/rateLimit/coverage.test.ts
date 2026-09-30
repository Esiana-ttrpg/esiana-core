import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectRateLimitCoverage,
  findEntry,
  findUncoveredOperations,
} from './coverage.js';

test('every statically mounted HTTP operation has an effective rate-limit policy', () => {
  const entries = collectRateLimitCoverage();
  assert.ok(entries.length > 50, `expected many routes, got ${entries.length}`);

  const uncovered = findUncoveredOperations(entries);
  assert.deepEqual(
    uncovered.map((u) => `${u.method} ${u.path}`),
    [],
    'uncovered operations must be empty or listed in coverage.exemptions.ts',
  );
});

test('CodeQL-flagged operations include expected policies', () => {
  const entries = collectRateLimitCoverage();

  const cases: Array<{
    method: string;
    pathIncludes: string;
    expect: string[];
    forbid?: string[];
  }> = [
    { method: 'GET', pathIncludes: '/api/auth/providers', expect: ['public'] },
    { method: 'POST', pathIncludes: '/api/auth/logout', expect: ['public'] },
    {
      method: 'GET',
      pathIncludes: '/api/users/:id/avatar',
      expect: ['public', 'expensive'],
    },
    {
      method: 'POST',
      pathIncludes: '/api/user/profile/avatar',
      expect: ['authenticated', 'expensive'],
    },
    {
      method: 'DELETE',
      pathIncludes: '/api/user/account',
      expect: ['authenticated', 'mutation'],
    },
    {
      method: 'GET',
      pathIncludes: '/api/user/linked-accounts',
      expect: ['authenticated'],
    },
    {
      method: 'GET',
      pathIncludes: '/api/plugin-assets',
      expect: ['authenticated'],
      forbid: ['expensive'],
    },
    {
      method: 'POST',
      pathIncludes: '/api/campaigns/',
      expect: ['authenticated', 'expensive'],
    },
    {
      method: 'GET',
      pathIncludes: '/api/admin/system/backup',
      expect: ['admin', 'expensive'],
    },
    {
      method: 'POST',
      pathIncludes: '/wiki/tags/:tagId/icon',
      expect: ['authenticated', 'expensive'],
    },
    {
      method: 'GET',
      pathIncludes: '/backup/download/:assetId',
      expect: ['authenticated', 'expensive'],
    },
    {
      method: 'POST',
      pathIncludes: '/backup/restore',
      expect: ['authenticated', 'expensive'],
    },
    {
      method: 'GET',
      pathIncludes: '/wiki/session-notes/combined',
      expect: ['authenticated', 'expensive'],
    },
    {
      method: 'GET',
      pathIncludes: '/wiki/session-notes/index',
      expect: ['authenticated', 'expensive'],
    },
    {
      method: 'GET',
      pathIncludes: '/wiki/session-notes/:pageId/perspectives',
      expect: ['authenticated', 'expensive'],
    },
    {
      method: 'POST',
      pathIncludes: '/wiki-pages/upload',
      expect: ['authenticated', 'expensive'],
    },
    {
      method: 'POST',
      pathIncludes: '/uploads',
      expect: ['authenticated', 'expensive'],
    },
  ];

  for (const c of cases) {
    const entry = findEntry(entries, c.method, c.pathIncludes);
    assert.ok(
      entry,
      `missing coverage entry for ${c.method} *${c.pathIncludes}*`,
    );
    for (const policy of c.expect) {
      assert.ok(
        entry!.policies.includes(policy),
        `${c.method} ${entry!.path} should include policy "${policy}"; got [${entry!.policies.join(', ')}]`,
      );
    }
    for (const policy of c.forbid ?? []) {
      assert.ok(
        !entry!.policies.includes(policy),
        `${c.method} ${entry!.path} must not include policy "${policy}"; got [${entry!.policies.join(', ')}]`,
      );
    }
  }
});
