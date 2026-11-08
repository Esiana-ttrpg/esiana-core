import assert from 'node:assert/strict';
import test from 'node:test';
import { projectedWikiTargetIds, redactAdventureReferenceText } from './adventurePageProjection.js';

test('Party reference text removes hidden single-quoted spans and canonical links', () => {
  const allowed = (id: string) => id === 'shared-page' || id === 'shared-haven';
  const text = "<span data-id='secret-page'>Secret name</span> " +
    '[Hidden haven](/campaigns/red-sands/havens/safehouse) ' +
    '[Shared page](/campaigns/red-sands/wiki/shared-page) ' +
    '/campaigns/red-sands/havens/shared-haven';
  const result = redactAdventureReferenceText(text, allowed);
  assert.doesNotMatch(result, /secret-page|Secret name|safehouse|Hidden haven/);
  assert.match(result, /Shared page/);
  assert.match(result, /havens\/shared-haven/);
  assert.deepEqual(projectedWikiTargetIds({ text: "<span data-id='shared-page'>Shared page</span>" }), ['shared-page']);
});
