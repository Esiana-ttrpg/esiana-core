import { Eye, EyeOff, Users } from 'lucide-react';
import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import { formatWikiVisibilityLabel } from '@/lib/wikiPageHeaderMeta';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface NarrativeVisibilityBadgeProps {
  pageVisibility: string;
  discovery?: DiscoveryStateProjection | null;
  isDMUser?: boolean;
  isEditingPage: boolean;
  onVisibilityChange?: (next: 'Public' | 'Party' | 'DM_Only') => void | Promise<void>;
}

function resolveBadge(
  pageVisibility: string,
  discovery?: DiscoveryStateProjection | null,
): { label: string; tone: string; icon: typeof Users } {
  if (discovery?.state === 'partial' || discovery?.state === 'rumor') {
    return {
      label: 'PARTIALLY REVEALED',
      tone: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200',
      icon: Eye,
    };
  }
  if (pageVisibility === 'DM_Only') {
    return {
      label: 'DM ONLY',
      tone: 'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200',
      icon: EyeOff,
    };
  }
  if (pageVisibility === 'Party') {
    return {
      label: 'PUBLIC TO PARTY',
      tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
      icon: Users,
    };
  }
  return {
    label: formatWikiVisibilityLabel(pageVisibility).toUpperCase(),
    tone: 'border-border/50 bg-surface/60 text-muted',
    icon: Eye,
  };
}

export function NarrativeVisibilityBadge({
  pageVisibility,
  discovery,
  isDMUser: isDMUserProp,
  isEditingPage,
  onVisibilityChange,
}: NarrativeVisibilityBadgeProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const badge = resolveBadge(pageVisibility, discovery);
  const Icon = badge.icon;

  if (isEditingPage && isDMUser && onVisibilityChange) {
    return (
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
        <select
          value={pageVisibility}
          onChange={(e) =>
            void onVisibilityChange(
              e.target.value as 'Public' | 'Party' | 'DM_Only',
            )
          }
          className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider outline-none focus:border-primary/50 ${badge.tone}`}
          aria-label="Narrative visibility"
        >
          <option value="Public">Public</option>
          <option value="Party">Public to party</option>
          <option value="DM_Only">DM only</option>
        </select>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${badge.tone}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {badge.label}
    </span>
  );
}
