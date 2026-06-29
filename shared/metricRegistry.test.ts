import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  METRIC_REGISTRY,
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
});
