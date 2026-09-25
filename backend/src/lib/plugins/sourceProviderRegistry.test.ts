import assert from 'node:assert/strict';
import test from 'node:test';
import { clearSourceProviderRegistry, listSourceProviders, registerSourceProvider, searchSources } from './sourceProviderRegistry.js';

test.afterEach(() => clearSourceProviderRegistry());

test('only campaign-enabled providers are listed and searched', async () => {
  registerSourceProvider('fixture-library', {
    id: 'fixture-library', displayName: 'Fixture Library',
    async searchSources() { return [{ identity: { providerId: 'fixture-library', sourceId: 'atlas' }, metadata: { title: 'Sable Atlas' } }]; },
    async resolveSource() { return { title: 'Sable Atlas' }; },
  }, async (campaignId) => campaignId === 'allowed');
  assert.equal((await listSourceProviders('denied')).length, 0);
  assert.equal((await searchSources({ campaignId: 'allowed', userId: 'mira', query: 'atlas' })).results.length, 1);
});

test('one failed provider does not suppress successful results', async () => {
  registerSourceProvider('good-library', {
    id: 'good-library', displayName: 'Good',
    async searchSources() { return [{ identity: { providerId: 'good-library', sourceId: 'one' }, metadata: { title: 'One' } }]; },
    async resolveSource() { return { title: 'One' }; },
  }, async () => true);
  registerSourceProvider('bad-library', {
    id: 'bad-library', displayName: 'Bad',
    async searchSources() { throw new Error('secret failure'); },
    async resolveSource() { return null; },
  }, async () => true);
  const response = await searchSources({ campaignId: 'campaign', userId: 'mira', query: 'one' });
  assert.equal(response.results.length, 1);
  assert.deepEqual(response.diagnostics, [{ providerId: 'bad-library', status: 'unavailable' }]);
});

test('registration rejects duplicate and mismatched provider identities', () => {
  const provider = { id: 'fixture-library', displayName: 'Fixture', async searchSources() { return []; }, async resolveSource() { return null; } };
  registerSourceProvider('fixture-library', provider, async () => true);
  assert.throws(() => registerSourceProvider('fixture-library', provider, async () => true), /already registered/);
  assert.throws(() => registerSourceProvider('other-library', { ...provider, id: 'third-library' }, async () => true), /must match/);
});

test('malformed provider results are skipped without dropping valid siblings', async () => {
  registerSourceProvider('fixture-library', {
    id: 'fixture-library', displayName: 'Fixture',
    async searchSources() {
      return [
        { identity: { providerId: 'fixture-library', sourceId: 42 }, metadata: { title: true } },
        { identity: { providerId: 'fixture-library', sourceId: 'valid' }, metadata: { title: 'Valid', year: 10000 } },
      ] as never;
    },
    async resolveSource() { return { title: 'Valid' }; },
  }, async () => true);
  const response = await searchSources({ campaignId: 'campaign', userId: 'mira', query: 'valid' });
  assert.equal(response.results.length, 1);
  assert.equal(response.results[0]?.metadata.title, 'Valid');
  assert.equal(response.results[0]?.metadata.year, undefined);
});
