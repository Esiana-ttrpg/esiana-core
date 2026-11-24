import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adventureHidesGmChrome, isAdventurePreviewPerspective } from './adventurePreview';

test('Adventure supports only GM and Party perspectives', () => {
  assert.equal(isAdventurePreviewPerspective('dm'), true);
  assert.equal(isAdventurePreviewPerspective('party'), true);
  assert.equal(isAdventurePreviewPerspective('public'), false);
  assert.equal(adventureHidesGmChrome('dm'), false);
  assert.equal(adventureHidesGmChrome('party'), true);
});
