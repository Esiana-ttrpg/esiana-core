import type { WorkshopFormalizeTarget } from '@shared/workshopDocument';
import {
  WORKSHOP_FORMALIZE_TARGET_DEFS,
  workshopFormalizeTargetsForUiGroup,
} from '@shared/workshopFormalize';
import { inferAuthoringKindFromMetadata } from '@shared/authoringContext';

export function isWorkshopEligiblePage(
  canEdit: boolean,
  templateType: string,
): boolean {
  if (!canEdit) return false;
  if (templateType === 'TAGS_HUB') return false;
  return true;
}

export function isAuthoringWorkshopEligible(
  templateType: string,
  metadata?: unknown,
  canEdit = true,
): boolean {
  if (!isWorkshopEligiblePage(canEdit, templateType)) return false;
  const kind = inferAuthoringKindFromMetadata(metadata);
  return kind !== 'scene';
}

export const WORKSHOP_CREATE_TARGETS: Array<{
  target: WorkshopFormalizeTarget | 'blank';
  label: string;
  group: 'world' | 'narrative' | 'reference' | 'general';
}> = [
  ...WORKSHOP_FORMALIZE_TARGET_DEFS.filter((def) => def.showInUi).map((def) => ({
    target: def.id,
    label: def.label,
    group: def.uiGroup,
  })),
  { target: 'blank' as const, label: 'Blank draft', group: 'general' as const },
];

export { workshopFormalizeTargetsForUiGroup };
