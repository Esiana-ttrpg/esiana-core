/**
 * Progression workspace — section routing (browser-safe).
 */

export const PROGRESSION_SECTIONS = [
  { id: 'trajectories', label: 'Trajectories' },
  { id: 'advance', label: 'Advance Time' },
  { id: 'developments', label: 'Pending Developments' },
  { id: 'scheduledEffects', label: 'Scheduled Effects' },
  { id: 'consequences', label: 'Consequences' },
  { id: 'history', label: 'History' },
] as const;

export type ProgressionSectionId = (typeof PROGRESSION_SECTIONS)[number]['id'];

/** Interim default after Insights removal; Part 4 formalizes the full Progression IA. */
export const DEFAULT_PROGRESSION_SECTION: ProgressionSectionId = 'trajectories';

export function isProgressionSectionId(value: string | null | undefined): value is ProgressionSectionId {
  return Boolean(value && PROGRESSION_SECTIONS.some((section) => section.id === value));
}
