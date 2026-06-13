import { Skull } from 'lucide-react';
import type { CategoryIndexChild } from '@/lib/wiki';
import { buildCreatureCodexTileViewModel } from '@/lib/bestiaryBrowseProjection';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface BestiaryIndexTitleCellProps {
  child: CategoryIndexChild;
  isDMUser?: boolean;
  previewMode?: boolean;
}

export function BestiaryIndexTitleCell({
  child,
  isDMUser: isDMUserProp,
  previewMode = false,
}: BestiaryIndexTitleCellProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const model = buildCreatureCodexTileViewModel(child, isDMUser);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-surface/40">
        {model.portraitUrl && !model.showSilhouette ? (
          <img src={model.portraitUrl} alt="" className="size-full object-cover" />
        ) : (
          <Skull className="size-4 text-muted" strokeWidth={1.25} />
        )}
      </div>
      <div className="min-w-0">
        <span
          className={`text-sm font-semibold break-words ${
            previewMode ? 'text-focal-foreground' : 'text-primary'
          }`}
        >
          {model.displayName}
        </span>
        {model.discoveryLabel ? (
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">
            {model.discoveryLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
