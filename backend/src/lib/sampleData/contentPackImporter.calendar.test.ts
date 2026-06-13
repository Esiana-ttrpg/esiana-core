import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { parseFantasyCalendarExport } from '../fantasyCalendarImport.js';
import { discoverPackContent } from '../packContentDiscovery.js';

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../test/fixtures',
);

describe('contentPackImporter calendar delegation', () => {
  it('calendar-only pack parses same as direct fantasy calendar import', async () => {
    const packPath = path.join(fixtureRoot, 'content-packs/calendar-only-pack');
    const discovered = await discoverPackContent(packPath);
    const direct = parseFantasyCalendarExport(
      JSON.parse(
        readFileSync(path.join(packPath, 'calendar.json'), 'utf8'),
      ),
    );
    assert.deepEqual(discovered.calendar?.calendarName, direct.calendarName);
    assert.deepEqual(discovered.calendar?.months.length, direct.months.length);
  });

  it('somerden fixture is valid pack calendar input', () => {
    const raw = JSON.parse(
      readFileSync(path.join(fixtureRoot, 'fantasy-calendar-somerden.json'), 'utf8'),
    );
    const parsed = parseFantasyCalendarExport(raw);
    assert.equal(parsed.calendarName, 'Somerden');
    assert.equal(parsed.months.length, 12);
  });
});
