export type AdventurePreviewPerspective = 'dm' | 'party';

/** Disabled until all Adventure data paths enforce the selected audience server-side. */
export const ADVENTURE_AUDIENCE_PREVIEW_AVAILABLE = false;

export function isAdventurePreviewPerspective(value: unknown): value is AdventurePreviewPerspective {
  return value === 'dm' || value === 'party';
}

export function adventureHidesGmChrome(perspective: AdventurePreviewPerspective): boolean {
  return perspective !== 'dm';
}
