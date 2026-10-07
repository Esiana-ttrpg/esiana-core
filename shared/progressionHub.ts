/**
 * Progression workspace — section routing (browser-safe).
 *
 * Canonical IA: Graph [future] · Trajectories · Developments · History
 *
 * - **Trajectories** — create/edit individual directions over time (opt-in).
 * - **Developments** — review suggested/manual world changes.
 * - **History** — what developments happened.
 * - **Graph** (planned) — relationships between trajectories, entities, developments,
 *   pressures, and other interconnected world state. Not implemented; do not add
 *   relationship/propagation visualization to Trajectories.
 */

export const PROGRESSION_SECTIONS = [
  { id: 'trajectories', label: 'Trajectories' },
  { id: 'developments', label: 'Developments' },
  { id: 'history', label: 'History' },
] as const;

export type ProgressionSectionId = (typeof PROGRESSION_SECTIONS)[number]['id'];

/** Default opens Trajectories — where the world is going. */
export const DEFAULT_PROGRESSION_SECTION: ProgressionSectionId = 'trajectories';

export function isProgressionSectionId(value: string | null | undefined): value is ProgressionSectionId {
  return Boolean(value && PROGRESSION_SECTIONS.some((section) => section.id === value));
}
