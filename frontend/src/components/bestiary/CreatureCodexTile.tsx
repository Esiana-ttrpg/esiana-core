import { useMemo } from 'react';
import { Skull } from 'lucide-react';
import type { CategoryIndexChild } from '@/lib/wiki';
import { buildCreatureCodexTileViewModel } from '@/lib/bestiaryBrowseProjection';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';
import { BrowseVisibilityIndicator } from '@/components/narrative/VisibilityTierChip';

interface CreatureCodexTileProps {
  child: CategoryIndexChild;
  selected: boolean;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  isDMUser?: boolean;
  compact?: boolean;
}

export function CreatureCodexTile({
  child,
  selected,
  onSelect,
  onOpen,
  isDMUser: isDMUserProp,
  compact = false,
}: CreatureCodexTileProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const model = useMemo(
    () => buildCreatureCodexTileViewModel(child, isDMUser),
    [child, isDMUser],
  );

  const portraitClass = [
    'creature-codex-tile__portrait',
    model.showSilhouette ? 'creature-codex-tile--silhouette' : '',
    model.showPartialBlur ? 'creature-codex-tile--partial' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(child.id)}
      onDoubleClick={() => onOpen(child.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onOpen(child.id);
        }
      }}
      className={[
        'creature-codex-tile',
        `creature-tile-env--${model.envTint}`,
        selected ? 'creature-codex-tile--selected' : '',
        compact ? 'creature-codex-tile--compact' : '',
        'group text-left transition-transform hover:scale-[1.02]',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={portraitClass}>
        {model.portraitUrl ? (
          <img
            src={model.portraitUrl}
            alt=""
            className="size-full object-cover object-top transition-[filter] group-hover:brightness-110"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-surface/50 text-muted">
            <Skull className={compact ? 'size-8' : 'size-12'} strokeWidth={1.25} />
          </div>
        )}
      </div>

      <div className="creature-codex-tile__body">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="font-semibold leading-snug text-focal-foreground group-hover:text-primary">
            {model.displayName}
          </h3>
          <BrowseVisibilityIndicator
            pageVisibility={child.visibility}
            narrativeStatus={child.narrativeStatus?.status ?? null}
            showWhenElevated={isDMUser}
            compact
          />
        </div>
        {model.biomeLine ? (
          <p className="mt-0.5 text-xs text-muted">{model.biomeLine}</p>
        ) : null}
        {model.threatPresentation ? (
          <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            {model.threatPresentation}
          </p>
        ) : null}
        {!compact && (model.weaknessLine || model.resistLine) ? (
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
            {model.weaknessLine ? (
              <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-orange-600 dark:text-orange-400">
                Weak: {model.weaknessLine}
              </span>
            ) : null}
            {model.resistLine ? (
              <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-sky-600 dark:text-sky-400">
                Resists: {model.resistLine}
              </span>
            ) : null}
          </div>
        ) : null}
        {model.discoveryLabel ? (
          <p className="mt-1.5 text-[10px] uppercase tracking-wide text-muted">
            {model.discoveryLabel}
          </p>
        ) : null}
      </div>
    </button>
  );
}
