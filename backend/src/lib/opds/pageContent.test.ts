import assert from 'node:assert/strict';
import test from 'node:test';
import { projectedPageProse } from './pageContent.js';

test('extracts shared page prose in visual order without specialized fields', () => {
  assert.deepEqual(projectedPageProse([
    { type: 'text-tiptap', x: 1, y: 4, content: { markdown: 'Second' } },
    { type: 'stat-block', x: 0, y: 0, content: { markdown: 'Specialized' } },
    { type: 'text-biography', x: 0, y: 1, content: { markdown: ' A scholar. ' } },
    { type: 'text-tiptap', x: 0, y: 2, content: { markdown: 'First' } },
  ]), { description: 'A scholar.', lore: ['First', 'Second'] });
});

test('handles malformed and missing optional blocks', () => {
  assert.deepEqual(projectedPageProse(null), { lore: [] });
  assert.deepEqual(projectedPageProse([null, {}, { type: 'text-tiptap', content: { markdown: 3 } }]), { lore: [] });
});
