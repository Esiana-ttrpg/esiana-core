import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  METRIC_REGISTRY,
  PERSONAL_ATTRIBUTION_METRIC_IDS,
  filterMetricsByPrivacy,
  isMetricAllowedInContext,
  listMetricIds,
} from './metricRegistry.js';
import { metricValue } from './metricValue.js';

describe('metricRegistry', () => {
  it('has unique metric ids', () => {
    const ids = Object.keys(METRIC_REGISTRY);
    assert.equal(ids.length, new Set(ids).size);
  });

  it('keeps attribution counts on public profile while hiding owner-only edits', () => {
    assert.equal(isMetricAllowedInContext('attribution.totalWordsCreated', 'publicProfile'), true);
    assert.equal(isMetricAllowedInContext('attribution.totalEdits', 'publicProfile'), false);
    assert.equal(isMetricAllowedInContext('attribution.totalEdits', 'ownerProfile'), true);
  });

  it('filters metrics by privacy context', () => {
    const raw = {
      'attribution.totalWordsCreated': metricValue(250),
      'attribution.totalEdits': metricValue(40),
    };
    const publicView = filterMetricsByPrivacy(raw, 'publicProfile');
    assert.equal(Object.keys(publicView).length, 1);
    assert.equal(publicView['attribution.totalWordsCreated']?.status, 'value');
    assert.equal(publicView['attribution.totalEdits'], undefined);
  });

  it('lists metrics by kind', () => {
    const snapshotIds = listMetricIds('snapshot');
    assert.ok(snapshotIds.every((id) => id.startsWith('snapshot.')));
    assert.ok(snapshotIds.includes('snapshot.totalWords'));
  });

  it('keeps phase 2 habit metrics owner-only', () => {
    assert.equal(isMetricAllowedInContext('attribution.writingStreak', 'publicProfile'), false);
    assert.equal(isMetricAllowedInContext('attribution.writingStreak', 'ownerProfile'), true);
    assert.equal(isMetricAllowedInContext('period.wordsAdded', 'campaignMember'), true);
    assert.equal(isMetricAllowedInContext('period.wordsAdded', 'ownerProfile'), true);
    assert.equal(isMetricAllowedInContext('period.wordsAdded', 'publicProfile'), false);
    assert.equal(isMetricAllowedInContext('attribution.wordsAdded', 'publicProfile'), false);
  });

  it('includes phase 2 metric ids in registry', () => {
    assert.ok(METRIC_REGISTRY['period.wordsAdded']);
    assert.ok(METRIC_REGISTRY['attribution.favoriteWritingHour']);
  });

  it('locks the 13 personal attribution ids with 1.10 contract fields', () => {
    assert.equal(PERSONAL_ATTRIBUTION_METRIC_IDS.length, 13);
    for (const id of PERSONAL_ATTRIBUTION_METRIC_IDS) {
      const def = METRIC_REGISTRY[id];
      assert.equal(def.id, id);
      assert.equal(def.reportingClock, 'real_world');
      assert.ok(def.unit);
      assert.ok(def.source);
      assert.ok(def.timeSemantics);
      assert.ok(def.attributionRules);
      assert.ok(def.historicalCompleteness);
    }
  });

  it('requires every registry entry to declare the 1.10 contract fields', () => {
    for (const def of Object.values(METRIC_REGISTRY)) {
      assert.equal(typeof def.unit, 'string');
      assert.equal(typeof def.source, 'string');
      assert.equal(typeof def.timeSemantics, 'string');
      assert.equal(typeof def.attributionRules, 'string');
      assert.equal(typeof def.historicalCompleteness, 'string');
      assert.equal(typeof def.reportingClock, 'string');
    }
  });
});
