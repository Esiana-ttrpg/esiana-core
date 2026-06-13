import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveAnnotationsForGap } from './downtimeAnnotationDerivation.js';

test('deriveAnnotationsForGap collects character presence and location mentions', () => {
  const result = deriveAnnotationsForGap({
    gap: {
      gapId: 'gap:1000:5000',
      startEpochMinute: '1000',
      endEpochMinute: '5000',
      isOpen: false,
      sessionBeforeId: null,
      sessionAfterId: null,
      sessionBeforeSequenceOrder: null,
    },
    pages: [
      {
        id: 'char-seren',
        title: 'Seren',
        templateType: 'CHARACTER',
        metadata: {
          locationHistory: [
            {
              id: 'ev-1',
              effectiveDate: { year: 102, month: 1, day: 1 },
              locationPageId: 'loc-south',
              kind: 'residency',
              note: 'spent the winter in the southern provinces',
              sourceEventIds: [],
            },
          ],
        },
      },
      {
        id: 'loc-south',
        title: 'Southern Provinces',
        templateType: 'LOCATION',
        metadata: {},
      },
      {
        id: 'loc-northwall',
        title: 'Northwall',
        templateType: 'LOCATION',
        metadata: {
          downtimeAlterations: [
            {
              id: 'alt-1',
              sourceKind: 'event',
              sourceEventId: 'ev-1',
              outcomeId: 'out-1',
              description: 'remained under reconstruction during the Frost Months',
              atEpochMinute: '2500',
              appliedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      },
    ],
    dateBounds: {
      startDateParts: { year: 100, month: 12, day: 1 },
      endDateParts: { year: 102, month: 3, day: 1 },
    },
    mobilityEffects: [],
  });

  assert.equal(result.annotations.length, 1);
  assert.equal(result.annotations[0]?.entityPageId, 'char-seren');
  assert.match(result.annotations[0]?.note ?? '', /southern provinces/i);
  assert.equal(result.locationMentions.length, 1);
  assert.equal(result.locationMentions[0]?.locationPageId, 'loc-northwall');
});
