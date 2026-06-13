import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeDowntimeAnnotations,
  mergeDowntimeLocationMentions,
  parseDowntimeGapOverlay,
} from './downtimeAnnotations.js';

test('mergeDowntimeAnnotations prefers authored entity slots', () => {
  const merged = mergeDowntimeAnnotations(
    [
      {
        entityPageId: 'char-1',
        role: 'absent',
        note: 'authored note',
        source: 'authored',
      },
    ],
    [
      {
        entityPageId: 'char-1',
        role: 'present',
        note: 'derived note',
        source: 'derived',
      },
      {
        entityPageId: 'char-2',
        role: 'present',
        note: 'derived only',
        source: 'derived',
      },
    ],
  );
  assert.equal(merged.length, 2);
  assert.equal(merged[0]?.note, 'authored note');
  assert.equal(merged[1]?.entityPageId, 'char-2');
});

test('parseDowntimeGapOverlay normalizes gap overlay payload', () => {
  const parsed = parseDowntimeGapOverlay({
    gapId: 'gap:100:500',
    promotedLabel: 'Frost Months',
    locationMentions: [{ note: 'Harbor trade slowed.', source: 'authored' }],
  });
  assert.ok(parsed);
  assert.equal(parsed?.gapId, 'gap:100:500');
  assert.equal(parsed?.locationMentions?.[0]?.note, 'Harbor trade slowed.');
});

test('mergeDowntimeLocationMentions dedupes by note', () => {
  const merged = mergeDowntimeLocationMentions(
    [{ locationPageId: 'loc-1', note: 'Under reconstruction', source: 'authored' }],
    [{ locationPageId: 'loc-1', note: 'Under reconstruction', source: 'derived' }],
  );
  assert.equal(merged.length, 1);
});
