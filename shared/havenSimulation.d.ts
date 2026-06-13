/**
 * Layer 1 — haven ambient simulation (browser-safe pure logic).
 * Stored in DowntimeHaven.simulationHints.havenSimulation — no Prisma columns.
 * @see docs/architecture-internal/downtime-havens.md
 */
import type { AdvanceMagnitude } from './globalTimeHooks.js';
import type { HavenActivityTone, HavenPrimaryTheme, HavenStatus } from './havenMetadata.js';
export declare const HAVEN_SIMULATION_VERSION = "haven-simulation-v1";
export declare const HAVEN_SIMULATION_AXES: readonly ["prosperity", "danger", "morale", "notoriety", "stability", "security"];
export type HavenSimulationAxis = (typeof HAVEN_SIMULATION_AXES)[number];
export type HavenSimulationBandTone = 'neutral' | 'warning' | 'escalation';
export type HavenSimulationBand = {
    bandId: string;
    bandLabel: string;
    tone: HavenSimulationBandTone;
};
export type HavenSimulationAxes = Record<HavenSimulationAxis, number>;
export type HavenSimulationState = {
    version: typeof HAVEN_SIMULATION_VERSION;
    enabled: boolean;
    pausedReason: string | null;
    axes: HavenSimulationAxes;
    lockedAxes: Partial<Record<HavenSimulationAxis, boolean>>;
    lastSimulatedAtEpochMinute: string | null;
};
export type HavenSimulationContext = {
    status: HavenStatus;
    escalatingThreatCount: number;
    activeProjectCount: number;
    primaryTheme: HavenPrimaryTheme | null;
};
export type HavenSimulationBandCrossing = {
    axis: HavenSimulationAxis;
    fromBand: HavenSimulationBand;
    toBand: HavenSimulationBand;
    summary: string;
    tone: HavenActivityTone;
};
export type HavenSimulationAdvanceResult = {
    nextSimulation: HavenSimulationState;
    bandCrossings: HavenSimulationBandCrossing[];
    axisDrivers: Partial<Record<HavenSimulationAxis, string[]>>;
};
export type HavenSimulationAxisPresentation = {
    id: HavenSimulationAxis;
    label: string;
    bandLabel: string;
    tone: HavenSimulationBandTone;
};
export type HavenSimulationSnapshot = {
    enabled: boolean;
    pausedReason: string | null;
    pressureHeadline: string | null;
    axes: HavenSimulationAxisPresentation[];
    axisDrivers: Partial<Record<HavenSimulationAxis, string[]>>;
};
export declare function defaultHavenSimulationAxes(): HavenSimulationAxes;
export declare function emptyHavenSimulationState(): HavenSimulationState;
export declare function parseHavenSimulationFromHints(simulationHints: Record<string, unknown>): HavenSimulationState;
export declare function mergeHavenSimulationIntoHints(simulationHints: Record<string, unknown>, simulation: HavenSimulationState): Record<string, unknown>;
export declare function mergeHavenSimulationPatch(simulationHints: Record<string, unknown>, patch: Partial<Pick<HavenSimulationState, 'enabled' | 'pausedReason' | 'axes' | 'lockedAxes'>>): Record<string, unknown>;
export declare function bandIndexForValue(value: number): number;
export declare function bandMidpointForIndex(index: number): number;
export declare function formatHavenAxisBand(axis: HavenSimulationAxis, value: number): HavenSimulationBand;
export declare function isAxisEligibleForAdvance(axis: HavenSimulationAxis, elapsedMinutes: bigint): boolean;
export declare function buildBandCrossingSummary(axis: HavenSimulationAxis, fromIndex: number, toIndex: number, primaryTheme: HavenPrimaryTheme | null): string;
export declare function deriveAxisDriversForPresentation(axes: HavenSimulationAxes, context: HavenSimulationContext): Partial<Record<HavenSimulationAxis, string[]>>;
export declare function advanceHavenSimulation(input: {
    simulation: HavenSimulationState;
    elapsedMinutes: bigint;
    advanceMagnitude: AdvanceMagnitude;
    nextEpochMinute: string;
    context: HavenSimulationContext;
}): HavenSimulationAdvanceResult;
export declare function applySimulationDeltas(simulation: HavenSimulationState, deltas: Partial<Record<HavenSimulationAxis, number>>): HavenSimulationState;
export declare function buildDominantPressureHeadline(simulation: HavenSimulationState, axisDrivers: Partial<Record<HavenSimulationAxis, string[]>>): string | null;
export declare function buildHavenSimulationSnapshot(simulationHints: Record<string, unknown>, axisDrivers?: Partial<Record<HavenSimulationAxis, string[]>>): HavenSimulationSnapshot;
export declare function formatHavenSimulationAxisLabel(axis: HavenSimulationAxis): string;
export declare function listHavenSimulationBandLabels(axis: HavenSimulationAxis): readonly string[];
export declare function axisValueForBandIndex(index: number): number;
//# sourceMappingURL=havenSimulation.d.ts.map