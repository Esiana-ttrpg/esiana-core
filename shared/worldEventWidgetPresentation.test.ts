import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ChronologyDomainKind } from './chronologyDomainKinds.js';
import {
  formatWorldEventTypeLabel,
  resolveExplicitCategoryType,
  resolveWorldEventImportanceRank,
  resolveWorldEventWidgetType,
} from './worldEventWidgetPresentation.js';

test('resolveExplicitCategoryType maps calendar category names', () => {
  assert.equal(resolveExplicitCategoryType('Political'), 'political');
  assert.equal(resolveExplicitCategoryType('world change'), 'world_change');
  assert.equal(resolveExplicitCategoryType('Unknown Label'), null);
});

test('resolveWorldEventWidgetType prefers explicit category over domain', () => {
  assert.equal(
    resolveWorldEventWidgetType({
      domain: ChronologyDomainKind.ORG_RELATION,
      calendarCategoryName: 'Economic',
    }),
    'economic',
  );
});

test('resolveWorldEventWidgetType uses domain defaults without title heuristics', () => {
  assert.equal(
    resolveWorldEventWidgetType({
      domain: ChronologyDomainKind.ORG_RELATION,
      calendarCategoryName: null,
    }),
    'conflict',
  );
  assert.equal(
    resolveWorldEventWidgetType({
      domain: ChronologyDomainKind.FACTION_CONTROL,
    }),
    'political',
  );
  assert.equal(
    resolveWorldEventWidgetType({
      domain: ChronologyDomainKind.SESSION_CHRONICLE,
    }),
    'other',
  );
});

test('resolveWorldEventImportanceRank uses domain proxy when importance absent', () => {
  assert.equal(
    resolveWorldEventImportanceRank({
      domain: ChronologyDomainKind.WORLD_EVENT,
      importance: null,
    }),
    0,
  );
  assert.equal(
    resolveWorldEventImportanceRank({
      domain: ChronologyDomainKind.FACTION_CONTROL,
      importance: null,
    }),
    3,
  );
  assert.equal(
    resolveWorldEventImportanceRank({
      domain: ChronologyDomainKind.WORLD_EVENT,
      importance: 2,
    }),
    2,
  );
});

test('formatWorldEventTypeLabel returns canonical labels', () => {
  assert.equal(formatWorldEventTypeLabel('world_change'), 'World Change');
});
