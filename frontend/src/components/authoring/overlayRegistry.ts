import type { AuthoringOverlayId } from '@shared/authoringContext';

export interface AuthoringOverlayDefinition {
  id: AuthoringOverlayId;
  label: string;
  description: string;
}

export const AUTHORING_OVERLAYS: AuthoringOverlayDefinition[] = [
  {
    id: 'mystery-structure',
    label: 'Mystery structure',
    description: 'Discovery, analysis, and confrontation pacing for investigation arcs.',
  },
  {
    id: 'three-act-pacing',
    label: 'Three-act pacing',
    description: 'Act structure reminders for long-horizon campaigns.',
  },
  {
    id: 'open-threads',
    label: 'Open threads',
    description: 'Unresolved narrative threads linked to this workspace.',
  },
  {
    id: 'arc-progress',
    label: 'Arc progress',
    description: 'Structural completion across objectives and quests.',
  },
];

export function getAuthoringOverlay(id: AuthoringOverlayId): AuthoringOverlayDefinition | undefined {
  return AUTHORING_OVERLAYS.find((o) => o.id === id);
}
