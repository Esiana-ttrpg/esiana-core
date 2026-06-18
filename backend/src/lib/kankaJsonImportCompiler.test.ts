import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { compileKankaJsonZip } from './kankaJsonImportCompiler.js';

test('compileKankaJsonZip emits virtual narrative entries from entity JSON', async () => {
  const zip = new JSZip();
  zip.file('info.json', JSON.stringify({ kanka_version: '3.0' }));
  zip.file('campaign.json', JSON.stringify({ name: 'Test Campaign' }));
  zip.file(
    'characters/anya-nightshadow_6401071.json',
    JSON.stringify({
      id: 6401071,
      type: 'NPC',
      entity: {
        id: 6401071,
        name: 'Anya Nightshadow',
        type: 'NPC',
        entry: '<p>Shadow broker.</p>',
      },
    }),
  );
  zip.file(
    'locations/elderhelm_6359027.json',
    JSON.stringify({
      id: 6359027,
      type: 'City',
      entity: {
        id: 6359027,
        name: 'Elderhelm',
        type: 'City',
        entry: '<p>A northern city.</p>',
      },
    }),
  );
  zip.file('abilities/power_1.json', JSON.stringify({ entity: { id: 1, name: 'Skip me' } }));

  const result = await compileKankaJsonZip(zip);
  assert.equal(result.entries.length, 2);
  const character = result.entries.find((entry) => entry.title === 'Anya Nightshadow');
  assert.ok(character);
  assert.equal(character.source, 'kanka-json');
  assert.match(character.body, /Shadow broker/);
  assert.equal(result.externalKeyToPageId.get('6401071'), character.id);
  assert.ok(result.skippedModuleCounts.some((row) => row.folder === 'abilities'));
});
