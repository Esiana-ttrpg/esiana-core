import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parsePackRelations } from '../packRelationsImporter.js';

describe('contentPackImporter relations', () => {
  it('parses valid relations.json shape', () => {
    const parsed = parsePackRelations({
      links: [{ sourcePageId: 'a', targetPageId: 'b' }],
      tags: [{ pageId: 'a', tagName: 'lore', tagLabel: 'Lore' }],
      mapPins: [],
    });
    assert.ok(parsed);
    assert.equal(parsed?.links.length, 1);
    assert.equal(parsed?.tags.length, 1);
  });

  it('returns null for invalid relations', () => {
    assert.equal(parsePackRelations(null), null);
    assert.equal(parsePackRelations({ links: 'bad' }), null);
  });

  it('packs without relations.json are valid (optional forever)', async () => {
    const { discoverPackContent } = await import('../packContentDiscovery.js');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const fixtureRoot = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../test/fixtures/content-packs/test-pack',
    );
    const discovered = await discoverPackContent(fixtureRoot);
    assert.equal(discovered.relations, null);
    assert.ok(discovered.markdownFileCount > 0);
  });
});
