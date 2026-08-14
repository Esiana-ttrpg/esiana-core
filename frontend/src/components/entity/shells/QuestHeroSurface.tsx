import { NarrativeVisibilityBadge } from './NarrativeVisibilityBadge';
import type { DiscoveryStateProjection } from '@shared/discoveryProjection';

interface QuestHeroSurfaceProps {
  pageVisibility: string;
  discovery?: DiscoveryStateProjection | null;
  isEditingPage: boolean;
  onVisibilityChange?: (next: 'Public' | 'Party' | 'DM_Only') => void | Promise<void>;
}

/** Minimal quest anchor — visibility lives in Identity; hero band aligns with character shell rhythm. */
export function QuestHeroSurface({
  pageVisibility,
  discovery,
  isEditingPage,
  onVisibilityChange,
}: QuestHeroSurfaceProps) {
  return (
    <div
      className="-mt-0.5 mb-5 flex justify-end border-b border-border/25 pb-4"
      aria-label="Quest visibility"
    >
      <NarrativeVisibilityBadge
        pageVisibility={pageVisibility}
        discovery={discovery}
        isEditingPage={isEditingPage}
        onVisibilityChange={onVisibilityChange}
      />
    </div>
  );
}
