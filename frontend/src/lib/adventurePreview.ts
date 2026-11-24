export type AdventurePreviewPerspective = 'dm' | 'party';

export const ADVENTURE_AUDIENCE_PREVIEW_AVAILABLE = true;

export function isAdventurePreviewPerspective(value: unknown): value is AdventurePreviewPerspective {
  return value === 'dm' || value === 'party';
}

export function adventureHidesGmChrome(perspective: AdventurePreviewPerspective): boolean {
  return perspective !== 'dm';
}
