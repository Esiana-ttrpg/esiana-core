import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  listCoreSampleDataProfiles,
  resolveSampleDataSpec,
} from './sampleDataRegistry.js';

describe('sampleDataRegistry', () => {
  const original = process.env.ENABLE_SAMPLE_DATA;

  before(() => {
    process.env.ENABLE_SAMPLE_DATA = 'true';
  });

  after(() => {
    if (original === undefined) delete process.env.ENABLE_SAMPLE_DATA;
    else process.env.ENABLE_SAMPLE_DATA = original;
  });

  it('lists four benchmark profiles when enabled', () => {
    const profiles = listCoreSampleDataProfiles();
    assert.equal(profiles.length, 4);
    assert.ok(profiles.some((profile) => profile.profileId === 'benchmark-medium'));
  });

  it('hides extreme archive from wizard-only listing', () => {
    const wizardProfiles = listCoreSampleDataProfiles({ wizardOnly: true });
    assert.equal(wizardProfiles.length, 3);
    assert.ok(!wizardProfiles.some((profile) => profile.profileId === 'benchmark-extreme'));
  });

  it('resolves benchmark-medium profile with page targets', () => {
    const resolved = resolveSampleDataSpec({
      kind: 'sampleData',
      profileId: 'benchmark-medium',
    });
    assert.equal(resolved.ok, true);
    if (resolved.ok) {
      assert.equal(resolved.resolved.profileId, 'benchmark-medium');
      assert.equal(resolved.resolved.params.pageCount, 1000);
      assert.equal(resolved.resolved.params.characterCount, 300);
    }
  });

  it('resolves deprecated standard-campaign alias', () => {
    const resolved = resolveSampleDataSpec({
      kind: 'sampleData',
      profileId: 'standard-campaign',
    });
    assert.equal(resolved.ok, true);
    if (resolved.ok) {
      assert.equal(resolved.resolved.profileId, 'benchmark-medium');
    }
  });

  it('rejects unknown profile ids', () => {
    const resolved = resolveSampleDataSpec({
      kind: 'sampleData',
      profileId: 'not-a-real-profile',
    });
    assert.equal(resolved.ok, false);
  });
});
