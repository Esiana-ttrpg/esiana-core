import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readMetricAmount, type MetricValue } from '../../../../../shared/metricValue.js';
import { CampaignWorkspace } from '../../../../../shared/campaignWorkspace.js';
import {
  assembleCartographyStats,
  isMappedLocationPin,
} from './assembleCartography.js';

function unavailableReason(value: MetricValue | undefined): string | null {
  return value?.status === 'unavailable' ? value.reason : null;
}

const start = new Date('2026-06-01T00:00:00.000Z');
const end = new Date('2026-07-01T00:00:00.000Z');

describe('assembleCartographyStats', () => {
  it('counts maps, markers, layers, regions, labels, and location pins without pan/zoom', () => {
    const stats = assembleCartographyStats({
      maps: [{ createdAt: new Date('2026-05-01T00:00:00.000Z') }],
      markers: [
        {
          createdAt: new Date('2026-06-10T00:00:00.000Z'),
          targetPage: {
            id: 'loc-1',
            workspace: CampaignWorkspace.LOCATIONS,
            templateType: 'DEFAULT',
            metadata: {},
          },
        },
        {
          createdAt: new Date('2026-05-10T00:00:00.000Z'),
          targetPage: {
            id: 'char-1',
            workspace: CampaignWorkspace.CHARACTERS,
            templateType: 'DEFAULT',
            metadata: {},
          },
        },
      ],
      regions: [{ createdAt: new Date('2026-06-12T00:00:00.000Z') }],
      layers: [{ createdAt: new Date('2026-06-02T00:00:00.000Z') }],
      labels: [{ createdAt: new Date('2026-04-01T00:00:00.000Z') }],
      periodEditsByDomain: { maps: 2, markers: 1 },
      hasEditInstrumentation: true,
      rangeStart: start,
      rangeEnd: end,
      skipPeriod: false,
      visibility: 'owner',
    });
    const byDomain = Object.fromEntries(stats.map((row) => [row.domain, row]));
    assert.equal(readMetricAmount(byDomain.maps?.created), 1);
    assert.equal(readMetricAmount(byDomain.markers?.created), 2);
    assert.equal(readMetricAmount(byDomain.locationsMapped?.created), 1);
    assert.equal(readMetricAmount(byDomain.markers?.periodCreated), 1);
    assert.equal(readMetricAmount(byDomain.maps?.periodCreated), 0);
    assert.equal(readMetricAmount(byDomain.maps?.periodEdited), 2);
    assert.equal(unavailableReason(byDomain.locationsMapped?.periodEdited), 'not_yet_tracked');
    assert.equal(isMappedLocationPin({
      createdAt: start,
      targetPage: null,
    }), false);
  });

  it('marks pre-instrumentation edits unavailable instead of zero', () => {
    const stats = assembleCartographyStats({
      maps: [{ createdAt: start }],
      markers: [],
      regions: [],
      layers: [],
      labels: [],
      periodEditsByDomain: {},
      hasEditInstrumentation: false,
      rangeStart: start,
      rangeEnd: end,
      skipPeriod: false,
      visibility: 'owner',
    });
    const maps = stats.find((row) => row.domain === 'maps');
    assert.equal(readMetricAmount(maps?.created), 1);
    assert.equal(unavailableReason(maps?.periodEdited), 'not_yet_tracked');
  });

  it('hides period cartography from public visibility', () => {
    const stats = assembleCartographyStats({
      maps: [{ createdAt: start }],
      markers: [],
      regions: [],
      layers: [],
      labels: [],
      periodEditsByDomain: { maps: 4 },
      hasEditInstrumentation: true,
      rangeStart: start,
      rangeEnd: end,
      skipPeriod: false,
      visibility: 'public',
    });
    const maps = stats.find((row) => row.domain === 'maps');
    assert.equal(readMetricAmount(maps?.created), 1);
    assert.equal(unavailableReason(maps?.periodCreated), 'private');
    assert.equal(unavailableReason(maps?.periodEdited), 'private');
  });
});
