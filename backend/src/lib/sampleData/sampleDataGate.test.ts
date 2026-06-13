import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { listCoreSampleDataProfiles, resolveSampleDataSpec } from './sampleDataRegistry.js';

describe('sampleData env gate', () => {
  const original = process.env.ENABLE_SAMPLE_DATA;

  afterEach(() => {
    if (original === undefined) delete process.env.ENABLE_SAMPLE_DATA;
    else process.env.ENABLE_SAMPLE_DATA = original;
  });

  it('returns empty profile list when disabled', () => {
    process.env.ENABLE_SAMPLE_DATA = 'false';
    assert.deepEqual(listCoreSampleDataProfiles(), []);
  });

  it('rejects resolve when disabled', () => {
    process.env.ENABLE_SAMPLE_DATA = 'false';
    const resolved = resolveSampleDataSpec({
      kind: 'sampleData',
      profileId: 'standard-campaign',
    });
    assert.equal(resolved.ok, false);
    if (!resolved.ok) {
      assert.match(resolved.error, /ENABLE_SAMPLE_DATA/);
    }
  });
});
