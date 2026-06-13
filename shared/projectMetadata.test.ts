import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceProjectElapsed,
  accumulateProjectStall,
  canProjectProgress,
  compareProjectSummariesByPriority,
  computeProgressPercent,
  emptyDowntimeProjectFields,
  isTerminalProjectStatus,
  isValidProjectStatusTransition,
  parseDowntimeProjectFields,
  shouldAccumulateStall,
  buildProjectBlockersSummary,
  formatProjectStalledLabel,
  parseProjectTreasuryEffectPayload,
} from './projectMetadata.js';

describe('projectMetadata', () => {
  it('defaults missing fields', () => {
    assert.deepEqual(parseDowntimeProjectFields(null), emptyDowntimeProjectFields());
  });

  it('parses status, priority, and nested entries', () => {
    const fields = parseDowntimeProjectFields({
      status: 'active',
      priority: 'high',
      projectType: 'construction',
      durationTotalMinutes: '10080',
      durationElapsedMinutes: '5040',
      resources: [
        {
          label: 'Stone shipment',
          satisfied: false,
          sourceKind: 'linked_page',
          linkedPageId: 'page-1',
        },
      ],
      blockers: [{ label: 'Winter storms', resolved: false }],
    });

    assert.equal(fields.status, 'ACTIVE');
    assert.equal(fields.priority, 'high');
    assert.equal(fields.projectType, 'construction');
    assert.equal(fields.durationTotalMinutes, 10080n);
    assert.equal(fields.durationElapsedMinutes, 5040n);
    assert.equal(fields.progressPercent, 50);
    assert.equal(fields.resources.length, 1);
    assert.equal(fields.resources[0]?.sourceKind, 'linked_page');
    assert.equal(fields.blockers[0]?.label, 'Winter storms');
  });

  it('derives progress percent from elapsed and total minutes', () => {
    assert.equal(computeProgressPercent(30n, 100n), 30);
    assert.equal(computeProgressPercent(0n, 0n), 0);
    assert.equal(computeProgressPercent(120n, 100n), 100);
  });

  it('validates status transitions', () => {
    assert.equal(isValidProjectStatusTransition('PLANNED', 'ACTIVE'), true);
    assert.equal(isValidProjectStatusTransition('ACTIVE', 'PAUSED'), true);
    assert.equal(isValidProjectStatusTransition('ACTIVE', 'SUSPENDED'), true);
    assert.equal(isValidProjectStatusTransition('SUSPENDED', 'ACTIVE'), true);
    assert.equal(isValidProjectStatusTransition('COMPLETED', 'ACTIVE'), false);
    assert.equal(isValidProjectStatusTransition('PLANNED', 'COMPLETED'), false);
  });

  it('detects terminal statuses', () => {
    assert.equal(isTerminalProjectStatus('COMPLETED'), true);
    assert.equal(isTerminalProjectStatus('ACTIVE'), false);
  });

  it('sorts summaries by priority then title', () => {
    const sorted = [
      { priority: 'low' as const, title: 'Alpha' },
      { priority: 'critical' as const, title: 'Zulu' },
      { priority: 'high' as const, title: 'Bravo' },
    ].sort(compareProjectSummariesByPriority);

    assert.deepEqual(
      sorted.map((row) => row.priority),
      ['critical', 'high', 'low'],
    );
  });

  it('gates progress on blockers and resources', () => {
    const base = {
      ...emptyDowntimeProjectFields(),
      status: 'ACTIVE' as const,
    };
    assert.equal(canProjectProgress(base), true);

    const blocked = {
      ...base,
      blockers: [{ id: 'b1', label: 'Storms', description: null, resolved: false, linkedPageId: null }],
    };
    assert.equal(canProjectProgress(blocked), false);
    assert.equal(shouldAccumulateStall('ACTIVE', false), true);

    const resourced = {
      ...base,
      resources: [
        {
          id: 'r1',
          label: 'Stone',
          quantity: null,
          unit: null,
          satisfied: false,
          linkedPageId: null,
          sourceKind: 'manual' as const,
        },
      ],
    };
    assert.equal(canProjectProgress(resourced), false);
  });

  it('advances elapsed minutes and completes at total', () => {
    const fields = {
      ...emptyDowntimeProjectFields(),
      status: 'ACTIVE' as const,
      durationTotalMinutes: 10080n,
      durationElapsedMinutes: 0n,
    };
    const mid = advanceProjectElapsed(fields, 5040n, 5040n);
    assert.equal(mid.progressed, true);
    assert.equal(mid.completed, false);
    assert.equal(mid.fields.durationElapsedMinutes, 5040n);

    const done = advanceProjectElapsed(mid.fields, 5040n, 10080n);
    assert.equal(done.completed, true);
    assert.equal(done.fields.status, 'COMPLETED');
    assert.equal(done.fields.durationElapsedMinutes, 10080n);
  });

  it('accumulates stall time when gated or paused', () => {
    const gated = {
      ...emptyDowntimeProjectFields(),
      status: 'ACTIVE' as const,
      blockers: [{ id: 'b1', label: 'Winter', description: null, resolved: false, linkedPageId: null }],
    };
    const stalled = advanceProjectElapsed(gated, 1440n, 1440n);
    assert.equal(stalled.stalled, true);
    assert.equal(stalled.fields.stalledDurationMinutes, 1440n);
    assert.equal(stalled.fields.durationElapsedMinutes, 0n);

    const paused = accumulateProjectStall(
      { ...emptyDowntimeProjectFields(), status: 'PAUSED' },
      2880n,
    );
    assert.equal(paused.stalledDurationMinutes, 2880n);
  });

  it('formats stall labels from minutes', () => {
    assert.equal(formatProjectStalledLabel(720n), null);
    assert.equal(formatProjectStalledLabel(1440n), 'Stalled for 1 day');
    assert.match(buildProjectBlockersSummary([
      { id: '1', label: 'Storms', description: null, resolved: false, linkedPageId: null },
    ]) ?? '', /Blocked by/);
  });

  it('parses treasury effect outcome payload', () => {
    assert.deepEqual(
      parseProjectTreasuryEffectPayload({
        amount: 450,
        kind: 'debit',
        category: 'project',
        title: 'Citadel repairs',
      }),
      {
        amount: 450,
        kind: 'debit',
        category: 'project',
        title: 'Citadel repairs',
      },
    );
  });
});
