/**
 * Progression workspace — section routing (browser-safe).
 */

export const PROGRESSION_SECTIONS = [
  { id: 'scenes', label: 'Scenes' },
  { id: 'workshop', label: 'Workshop' },
  { id: 'sessionPrep', label: 'Session Prep' },
  { id: 'insights', label: 'Insights' },
  { id: 'advance', label: 'Advance Time' },
  { id: 'developments', label: 'Pending Developments' },
  { id: 'scheduledEffects', label: 'Scheduled Effects' },
  { id: 'consequences', label: 'Consequences' },
  { id: 'history', label: 'History' },
] as const;

export type ProgressionSectionId = (typeof PROGRESSION_SECTIONS)[number]['id'];

export const SCENES_VIEWS = [
  { id: 'outline', label: 'Outline' },
  { id: 'board', label: 'Board' },
  { id: 'sequence', label: 'Sequence' },
] as const;

export type ScenesViewId = (typeof SCENES_VIEWS)[number]['id'];

export const DEFAULT_SCENES_VIEW: ScenesViewId = 'outline';

export const DEFAULT_PROGRESSION_SECTION: ProgressionSectionId = 'scenes';

/** Maps Progression section id to adventure-hub API section param. */
export function progressionToAdventureApiSection(
  section: ProgressionSectionId,
  scenesView?: ScenesViewId,
): string | null {
  switch (section) {
    case 'sessionPrep':
      return 'sessions';
    case 'scenes':
      return scenesView === 'sequence' ? 'scene-timeline' : 'scenes';
    default:
      return null;
  }
}

export type LegacyProgressionRedirect = {
  section: ProgressionSectionId;
  view?: ScenesViewId;
  /** Preserve authoringKind, anchors, overlays from legacy authoringWorkshop URLs. */
  preserveSearchParams?: boolean;
};

/** Legacy progression / adventure section aliases → canonical route. */
export function resolveLegacyProgressionRedirect(
  section: string | null,
): LegacyProgressionRedirect | null {
  if (!section) return null;
  switch (section) {
    case 'storyboard':
      return { section: 'scenes', view: 'board' };
    case 'sceneSequence':
    case 'scene-timeline':
    case 'sceneTimeline':
      return { section: 'scenes', view: 'sequence' };
    case 'trajectories':
      return { section: 'insights' };
    case 'authoringWorkshop':
      return { section: 'workshop', preserveSearchParams: true };
    default:
      break;
  }
  if (PROGRESSION_SECTIONS.some((s) => s.id === section)) {
    return { section: section as ProgressionSectionId };
  }
  return null;
}

/** @deprecated Use resolveLegacyProgressionRedirect */
export function resolveLegacyProgressionSection(
  section: string | null,
): ProgressionSectionId | null {
  const redirect = resolveLegacyProgressionRedirect(section);
  return redirect?.section ?? null;
}
