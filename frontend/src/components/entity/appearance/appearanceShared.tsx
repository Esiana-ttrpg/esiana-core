import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import type { AppearanceDetailsFields } from '@shared/appearanceMetadata';

export const appearanceFieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

export function SectionLabel({ children }: { children: string }) {
  return (
    <h4 className={META_SECTION_LABEL_CLASS}>{children}</h4>
  );
}

/** Parse comma-separated input for persistence (trims each segment). */
export function parseCommaList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Parse while typing — preserves spaces within a segment. */
export function parseCommaListDraft(value: string): string[] {
  if (!value) return [];
  return value.split(',');
}

export function formatCommaList(items: string[]): string {
  return items.join(', ');
}

export const EMPTY_DETAILS: AppearanceDetailsFields = {
  build: null,
  voice: null,
  distinguishingFeatures: [],
  clothingMotifs: null,
  visibleInjuries: [],
  vibeImpression: null,
  atAGlance: null,
};
