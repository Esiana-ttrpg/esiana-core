import { EyeOff } from 'lucide-react';
import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface NarrativeVisibilityBadgeProps {
  pageVisibility: string;
  discovery?: DiscoveryStateProjection | null;
  isDMUser?: boolean;
  isEditingPage: boolean;
  onVisibilityChange?: (next: 'Public' | 'Party' | 'DM_Only') => void | Promise<void>;
}

const PRIVATE_BADGE_TONE =
  'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200';

export function NarrativeVisibilityBadge({
  pageVisibility,
  discovery: _discovery,
  isDMUser: isDMUserProp,
  isEditingPage,
  onVisibilityChange,
}: NarrativeVisibilityBadgeProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);

  if (isEditingPage && isDMUser && onVisibilityChange) {
    return (
      <div className="flex items-center gap-2">
        <EyeOff className="size-3.5 shrink-0 opacity-80" aria-hidden />
        <select
          value={pageVisibility}
          onChange={(e) =>
            void onVisibilityChange(
              e.target.value as 'Public' | 'Party' | 'DM_Only',
            )
          }
          className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider outline-none focus:border-primary/50 ${PRIVATE_BADGE_TONE}`}
          aria-label="Page access"
        >
          <option value="Public">Public</option>
          <option value="Party">Visible to party</option>
          <option value="DM_Only">Private (staff only)</option>
        </select>
      </div>
    );
  }

  if (pageVisibility !== 'DM_Only' || !isDMUser) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${PRIVATE_BADGE_TONE}`}
    >
      <EyeOff className="size-3.5 shrink-0" aria-hidden />
      Private
    </span>
  );
}
