import { Link } from 'react-router-dom';
import { Pencil, Skull } from 'lucide-react';
import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import type { CategoryIndexChild } from '@/lib/wiki';
import {
  buildBestiaryIdentityProjection,
  buildBestiaryIntelProjection,
} from '@/lib/bestiaryIdentityProjection';
import { buildCreatureCodexTileViewModel } from '@/lib/bestiaryBrowseProjection';
import { CreatureIntelStrip } from '@/components/entity/shells/CreatureIntelStrip';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface CreatureSelectedPreviewProps {
  campaignHandle: string;
  child: CategoryIndexChild | null;
  snapshots: readonly WikiPageLineageSnapshot[];
  isDMUser?: boolean;
  embedded?: boolean;
}

export function CreatureSelectedPreview({
  campaignHandle,
  child,
  snapshots,
  isDMUser: isDMUserProp,
  embedded = false,
}: CreatureSelectedPreviewProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const { flatPages } = useWiki();

  if (!child) {
    return (
      <p className="text-xs text-contextual-muted">
        Select a creature to scout intel.
      </p>
    );
  }

  const intel = buildBestiaryIntelProjection(child.metadata, child.discovery, isDMUser);
  const identity = buildBestiaryIdentityProjection(child.id, snapshots);
  const tile = buildCreatureCodexTileViewModel(child, isDMUser);

  const displayName = tile.displayName;
  const pagePath = campaignCategoryChildPath(
    campaignHandle,
    child.id,
    'Bestiary',
    flatPages,
  );

  return (
    <section className={embedded ? 'space-y-4' : 'space-y-4 p-4'}>
      <div className="flex gap-3">
        <div
          className={`flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-elevated/60 creature-tile-env--${tile.envTint}`}
        >
          {tile.portraitUrl && !tile.showSilhouette ? (
            <img src={tile.portraitUrl} alt="" className="size-full object-cover object-top" />
          ) : (
            <Skull className="size-10 text-muted/50" strokeWidth={1.25} />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold leading-snug text-contextual-foreground">
            {displayName}
          </h3>
          {identity?.identityLine ? (
            <p className="mt-0.5 text-xs text-contextual-muted">{identity.identityLine}</p>
          ) : null}
          {identity?.alsoKnownAs ? (
            <p className="mt-1 text-xs italic text-contextual-muted">
              &ldquo;{identity.alsoKnownAs}&rdquo;
            </p>
          ) : null}
          {tile.threatPresentation ? (
            <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              {tile.threatPresentation}
            </p>
          ) : null}
        </div>
      </div>

      <CreatureIntelStrip intel={intel} />

      <div className="flex flex-wrap gap-2 border-t border-border/50 pt-3">
        <Link
          to={pagePath}
          className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-background hover:bg-primary-hover"
        >
          Open field guide
        </Link>
        {isDMUser ? (
          <Link
            to={pagePath}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-foreground hover:bg-elevated/60"
          >
            <Pencil className="size-3" aria-hidden />
            Edit
          </Link>
        ) : null}
      </div>
    </section>
  );
}
