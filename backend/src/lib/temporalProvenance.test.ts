import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyTemporalMetadata,
  canOverrideTemporalMetadata,
  parseTemporalWriteEnvelope,
  resolveTemporalAuthority,
} from './temporalProvenance.js';

describe('temporalProvenance', () => {
  it('parses temporal envelope', () => {
    const env = parseTemporalWriteEnvelope({
      provenance: 'seed',
      preserveTemporalHistory: true,
      metadata: { createdAt: '2024-01-01T00:00:00.000Z' },
    });
    assert.equal(env?.provenance, 'seed');
    assert.equal(env?.preserveTemporalHistory, true);
  });

  it('resolves seed authority with campaign:seed scope', () => {
    const ctx = {
      provenance: 'seed' as const,
      preserveTemporalHistory: true,
      actorUserId: 'u1',
    };
    assert.equal(
      resolveTemporalAuthority(ctx, {
        role: 'USER',
        tokenScopes: ['campaign:seed'],
        pluginId: 'campaign-seeder',
      }),
      'trusted-import',
    );
  });

  it('resolves seed authority for core host-orchestrated jobs', () => {
    const ctx = {
      provenance: 'seed' as const,
      preserveTemporalHistory: true,
      actorUserId: 'u1',
    };
    assert.equal(
      resolveTemporalAuthority(ctx, {
        role: 'USER',
        tokenScopes: ['campaign:seed', 'campaign:write'],
        isCoreSeedJob: true,
      }),
      'trusted-import',
    );
  });

  it('import + untrusted allows only createdAt', () => {
    const ctx = {
      provenance: 'import' as const,
      preserveTemporalHistory: true,
      actorUserId: 'u1',
    };
    const authority = resolveTemporalAuthority(ctx, { role: 'USER' });
    assert.equal(authority, 'untrusted');
    assert.equal(canOverrideTemporalMetadata(ctx, { role: 'USER' }, authority), true);

    const { data, applied } = applyTemporalMetadata(
      {},
      {
        createdAt: '2024-06-01T12:00:00.000Z',
        updatedAt: '2024-06-02T12:00:00.000Z',
      },
      ctx,
      { role: 'USER' },
      authority,
      { now: new Date('2025-01-01') },
    );
    assert.equal(applied, true);
    assert.ok(data.createdAt);
    assert.equal(data.updatedAt, undefined);
  });

  it('restore + system applies full metadata', () => {
    const ctx = {
      provenance: 'restore' as const,
      preserveTemporalHistory: true,
      actorUserId: 'u1',
    };
    const authority = resolveTemporalAuthority(ctx, {
      role: 'USER',
      isSystemJob: true,
    });
    assert.equal(authority, 'system');

    const { data, applied, lastViewedAt } = applyTemporalMetadata(
      {},
      {
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-02-01T00:00:00.000Z',
        lastViewedAt: '2024-03-01T00:00:00.000Z',
      },
      ctx,
      { role: 'USER', isSystemJob: true },
      authority,
      { now: new Date('2025-01-01') },
    );
    assert.equal(applied, true);
    assert.equal(data.createdAt?.toISOString(), '2024-01-01T00:00:00.000Z');
    assert.equal(data.updatedAt?.toISOString(), '2024-02-01T00:00:00.000Z');
    assert.equal(lastViewedAt?.toISOString(), '2024-03-01T00:00:00.000Z');
  });

  it('user provenance never overrides', () => {
    const ctx = {
      provenance: 'user' as const,
      preserveTemporalHistory: true,
      actorUserId: 'u1',
    };
    const authority = resolveTemporalAuthority(ctx, { role: 'USER' });
    assert.equal(authority, 'none');
    const { applied } = applyTemporalMetadata(
      {},
      { createdAt: '2020-01-01T00:00:00.000Z' },
      ctx,
      { role: 'USER' },
      authority,
    );
    assert.equal(applied, false);
  });
});
