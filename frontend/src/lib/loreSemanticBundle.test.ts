import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isLoreSemanticBundleEmpty,
  resolveLoreSemanticBundleFromSettled,
  resolveLoreSemanticBundleStatus,
  sliceErrorMessage,
} from './loreSemanticBundle.ts';

describe('loreSemanticBundle', () => {
  it('isLoreSemanticBundleEmpty is true when all slices are empty', () => {
    assert.equal(
      isLoreSemanticBundleEmpty({
        aliases: [],
        canonicalTitle: 'Test',
        groups: [],
        accounts: [],
        claims: [],
      }),
      true,
    );
  });

  it('resolveLoreSemanticBundleStatus returns empty when all slices succeed with no data', () => {
    const bundle = {
      aliases: [],
      canonicalTitle: 'Test',
      groups: [],
      accounts: [],
      claims: [],
    };
    assert.equal(resolveLoreSemanticBundleStatus(bundle, {}), 'empty');
  });

  it('resolveLoreSemanticBundleStatus returns ready when a slice fails', () => {
    const bundle = {
      aliases: [],
      canonicalTitle: 'Test',
      groups: [],
      accounts: [],
      claims: [],
    };
    assert.equal(
      resolveLoreSemanticBundleStatus(bundle, { aliases: 'Network error' }),
      'ready',
    );
  });

  it('resolveLoreSemanticBundleFromSettled isolates partial failures', () => {
    const { bundle, errors } = resolveLoreSemanticBundleFromSettled({
      aliases: {
        ok: true,
        value: {
          aliases: [{ id: 'a1', name: 'Former Name' } as never],
          canonicalTitle: 'Current',
        },
      },
      interpretations: { ok: false, error: 'interpretations failed' },
      claims: { ok: true, value: [] },
    });

    assert.equal(bundle.aliases.length, 1);
    assert.equal(bundle.canonicalTitle, 'Current');
    assert.equal(bundle.claims.length, 0);
    assert.equal(errors.interpretations, 'interpretations failed');
    assert.equal(errors.aliases, undefined);
    assert.equal(errors.claims, undefined);
    assert.equal(
      resolveLoreSemanticBundleStatus(bundle, errors),
      'ready',
    );
  });

  it('sliceErrorMessage prefers Error.message', () => {
    assert.equal(sliceErrorMessage(new Error('boom')), 'boom');
    assert.equal(sliceErrorMessage('x'), 'Failed to load');
  });
});
