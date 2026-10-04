/**
 * Progression workspace — section routing (browser-safe).
 *
 * Canonical IA: Trajectories | Developments | History
 * Planned later (not implemented): Graph — interconnected trajectory visualization.
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
