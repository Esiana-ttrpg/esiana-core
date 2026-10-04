/**
 * Progression workspace — section routing (browser-safe).
 */

export const PROGRESSION_SECTIONS = [
  { id: 'insights', label: 'Insights' },
  { id: 'advance', label: 'Advance Time' },
  { id: 'developments', label: 'Pending Developments' },
  { id: 'scheduledEffects', label: 'Scheduled Effects' },
  { id: 'consequences', label: 'Consequences' },
  { id: 'history', label: 'History' },
] as const;

export type ProgressionSectionId = (typeof PROGRESSION_SECTIONS)[number]['id'];

export const DEFAULT_PROGRESSION_SECTION: ProgressionSectionId = 'insights';

/** @deprecated Scenes/Storyboard moved under Adventure; kept for sticky/legacy typing. */
export const SCENES_VIEWS = [
  { id: 'outline', label: 'Outline' },
  { id: 'board', label: 'Board' },
  { id: 'sequence', label: 'Sequence' },
] as const;

/** @deprecated */
export type ScenesViewId = (typeof SCENES_VIEWS)[number]['id'];

/** @deprecated */
export const DEFAULT_SCENES_VIEW: ScenesViewId = 'outline';

export type LegacyProgressionRedirect =
  | {
      destination: 'progression';
      section: ProgressionSectionId;
      /** Preserve authoringKind, anchors, overlays from legacy authoringWorkshop URLs. */
      preserveSearchParams?: boolean;
    }
  | {
      destination: 'adventure';
      view: 'scenes' | 'storyboard';
      storyboardLens?: 'board' | 'sequence';
    };

/**
 * Legacy progression section aliases → Progression or Adventure destinations.
 * Adventure owns Scenes / Storyboard; Progression no longer hosts them.
 */
export function resolveLegacyProgressionRedirect(
  section: string | null,
  scenesView?: string | null,
): LegacyProgressionRedirect | null {
  if (!section) return null;
  switch (section) {
    case 'scenes':
      if (scenesView === 'board' || scenesView === 'sequence') {
        return {
          destination: 'adventure',
          view: 'storyboard',
          storyboardLens: scenesView,
        };
      }
      return { destination: 'adventure', view: 'scenes' };
    case 'sessionPrep':
    case 'sessions':
      return { destination: 'adventure', view: 'storyboard' };
    case 'storyboard':
      return {
        destination: 'adventure',
        view: 'storyboard',
        storyboardLens: 'board',
      };
    case 'sceneSequence':
    case 'scene-timeline':
    case 'sceneTimeline':
      return {
        destination: 'adventure',
        view: 'storyboard',
        storyboardLens: 'sequence',
      };
    case 'trajectories':
      return { destination: 'progression', section: 'insights' };
    case 'workshop':
    case 'authoringWorkshop':
      return null;
    default:
      break;
  }
  if (PROGRESSION_SECTIONS.some((s) => s.id === section)) {
    return { destination: 'progression', section: section as ProgressionSectionId };
  }
  return null;
}
