import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceHavenSimulation,
  applySimulationDeltas,
  bandIndexForValue,
  buildBandCrossingSummary,
  buildDominantPressureHeadline,
  buildHavenSimulationSnapshot,
  emptyHavenSimulationState,
  formatHavenAxisBand,
  isAxisEligibleForAdvance,
  mergeHavenSimulationIntoHints,
  mergeHavenSimulationPatch,
  parseHavenSimulationFromHints,
} from './havenSimulation.js';

describe('havenSimulation', () => {
  it('defaults when havenSimulation missing', () => {
    const state = parseHavenSimulationFromHints({});
    assert.equal(state.enabled, false);
    assert.equal(state.axes.prosperity, 50);
    assert.deepEqual(state.lockedAxes, {});
  });

  it('preserves unrelated simulationHints keys on merge', () => {
    const hints = { prosperitySeed: 0.4, havenSimulation: { enabled: true, axes: {} } };
    const state = parseHavenSimulationFromHints(hints);
    const merged = mergeHavenSimulationIntoHints(hints, {
      ...state,
      enabled: true,
    });
    assert.equal(merged.prosperitySeed, 0.4);
    assert.equal((merged.havenSimulation as { enabled: boolean }).enabled, true);
  });

  it('merge patch updates nested simulation fields', () => {
    const merged = mergeHavenSimulationPatch({}, {
      enabled: true,
      pausedReason: 'Magical stasis',
      lockedAxes: { danger: true },
      axes: { danger: 80 },
    });
    const state = parseHavenSimulationFromHints(merged);
    assert.equal(state.enabled, true);
    assert.equal(state.pausedReason, 'Magical stasis');
    assert.equal(state.lockedAxes.danger, true);
    assert.equal(state.axes.danger, 80);
  });

  it('maps axis values to band labels', () => {
    assert.equal(formatHavenAxisBand('prosperity', 10).bandLabel, 'Withering');
    assert.equal(formatHavenAxisBand('danger', 85).bandLabel, 'Desperate');
    assert.equal(formatHavenAxisBand('stability', 50).bandLabel, 'Fraying');
  });

  it('enforces significance thresholds per elapsed time', () => {
    assert.equal(isAxisEligibleForAdvance('prosperity', 500n), false);
    assert.equal(isAxisEligibleForAdvance('danger', 500n), true);
    assert.equal(isAxisEligibleForAdvance('notoriety', 20_000n), false);
    assert.equal(isAxisEligibleForAdvance('notoriety', 50_000n), true);
  });

  it('skips drift when paused or disabled', () => {
    const paused = advanceHavenSimulation({
      simulation: {
        ...emptyHavenSimulationState(),
        enabled: true,
        pausedReason: 'GM lock',
      },
      elapsedMinutes: 10_080n,
      advanceMagnitude: 'medium',
      nextEpochMinute: '10080',
      context: {
        status: 'under_siege',
        escalatingThreatCount: 2,
        activeProjectCount: 1,
        primaryTheme: 'smuggler',
      },
    });
    assert.equal(paused.bandCrossings.length, 0);
    assert.equal(paused.nextSimulation.axes.danger, 50);
  });

  it('skips drift for locked axes', () => {
    const result = advanceHavenSimulation({
      simulation: {
        ...emptyHavenSimulationState(),
        enabled: true,
        axes: { ...emptyHavenSimulationState().axes, danger: 75 },
        lockedAxes: { danger: true },
      },
      elapsedMinutes: 10_080n,
      advanceMagnitude: 'massive',
      nextEpochMinute: '50000',
      context: {
        status: 'under_siege',
        escalatingThreatCount: 3,
        activeProjectCount: 2,
        primaryTheme: null,
      },
    });
    assert.equal(result.nextSimulation.axes.danger, 75);
  });

  it('produces fiction-first crossing copy without stat strings', () => {
    const summary = buildBandCrossingSummary('prosperity', 2, 1, 'smuggler');
    assert.ok(summary.length > 0);
    assert.ok(!summary.includes('Strained'));
    assert.ok(!summary.includes('Prosperity'));
  });

  it('advances deterministically under siege over a week', () => {
    const input = {
      simulation: {
        ...emptyHavenSimulationState(),
        enabled: true,
        axes: { ...emptyHavenSimulationState().axes, danger: 78 },
      },
      elapsedMinutes: 10_080n,
      advanceMagnitude: 'medium' as const,
      nextEpochMinute: '10080',
      context: {
        status: 'under_siege' as const,
        escalatingThreatCount: 1,
        activeProjectCount: 0,
        primaryTheme: 'militant' as const,
      },
    };
    const a = advanceHavenSimulation(input);
    const b = advanceHavenSimulation(input);
    assert.deepEqual(a.nextSimulation.axes, b.nextSimulation.axes);
    if (a.bandCrossings.length > 0) {
      assert.ok(a.bandCrossings[0]!.summary.length > 10);
      assert.ok(a.axisDrivers.danger?.includes('haven under siege'));
    }
  });

  it('builds dominant pressure headline from concerning axes', () => {
    const simulation = {
      ...emptyHavenSimulationState(),
      enabled: true,
      axes: {
        ...emptyHavenSimulationState().axes,
        danger: 88,
        prosperity: 50,
      },
    };
    const headline = buildDominantPressureHeadline(simulation, {
      danger: ['unresolved threats'],
    });
    assert.ok(headline);
    assert.ok(!headline!.includes('Danger:'));
  });

  it('builds snapshot with band labels only', () => {
    const snapshot = buildHavenSimulationSnapshot(
      mergeHavenSimulationIntoHints({}, {
        ...emptyHavenSimulationState(),
        enabled: true,
        axes: { ...emptyHavenSimulationState().axes, morale: 15 },
      }),
    );
    assert.equal(snapshot.enabled, true);
    assert.equal(snapshot.axes.find((a) => a.id === 'morale')?.bandLabel, 'Broken');
    assert.ok(snapshot.axes.every((a) => !a.bandLabel.match(/^\d+$/)));
  });

  it('applySimulationDeltas clamps and respects locked axes', () => {
    const base = {
      ...emptyHavenSimulationState(),
      lockedAxes: { notoriety: true },
    };
    const next = applySimulationDeltas(base, {
      prosperity: 30,
      notoriety: 50,
      danger: 200,
    });
    assert.equal(next.axes.prosperity, 80);
    assert.equal(next.axes.notoriety, 50);
    assert.equal(next.axes.danger, 100);
  });

  it('band index boundaries', () => {
    assert.equal(bandIndexForValue(0), 0);
    assert.equal(bandIndexForValue(19), 0);
    assert.equal(bandIndexForValue(20), 1);
    assert.equal(bandIndexForValue(59), 2);
    assert.equal(bandIndexForValue(80), 4);
  });
});
