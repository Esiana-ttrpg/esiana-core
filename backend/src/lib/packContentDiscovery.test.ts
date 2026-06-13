import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  discoverPackContent,
  hasImportablePackContent,
} from './packContentDiscovery.js';

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../test/fixtures/content-packs',
);

describe('packContentDiscovery', () => {
  it('accepts markdown pages as importable content', async () => {
    const discovered = await discoverPackContent(path.join(fixtureRoot, 'test-pack'));
    assert.ok(hasImportablePackContent(discovered));
    assert.equal(discovered.markdownFileCount, 2);
    assert.equal(discovered.assetFileCount, 0);
    assert.equal(discovered.calendar, null);
    assert.equal(discovered.relations, null);
  });

  it('accepts assets-only packs', async () => {
    const discovered = await discoverPackContent(path.join(fixtureRoot, 'assets-only-pack'));
    assert.ok(hasImportablePackContent(discovered));
    assert.equal(discovered.markdownFileCount, 0);
    assert.equal(discovered.assetFileCount, 1);
  });

  it('delegates calendar.json to fantasy calendar parser', async () => {
    const discovered = await discoverPackContent(path.join(fixtureRoot, 'calendar-only-pack'));
    assert.ok(hasImportablePackContent(discovered));
    assert.ok(discovered.calendar);
    assert.equal(discovered.calendar?.calendarName, 'Minimal');
    assert.equal(discovered.markdownFileCount, 0);
  });

  it('fails when no importable content exists', async () => {
    const emptyDir = path.join(fixtureRoot, 'empty-pack');
    const discovered = await discoverPackContent(emptyDir);
    assert.equal(hasImportablePackContent(discovered), false);
  });
});
