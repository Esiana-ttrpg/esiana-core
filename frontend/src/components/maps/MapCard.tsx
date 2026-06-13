import { Link } from 'react-router-dom';
import { Layers, MapPin, Settings, Trash2 } from 'lucide-react';
import type { CampaignMapAsset } from '@/types/maps';
import { mapDisplayTitle } from '@/types/maps';
import { mapAssetImageUrl } from '@/lib/maps';
import { campaignPath, campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import { ElevatedBrowseVisibilityChip } from '@/components/narrative/VisibilityTierChip';

export type MapCardSize = 'compact' | 'expanded';

interface MapCardProps {
  map: CampaignMapAsset;
  campaignHandle: string;
  canManage: boolean;
  cardSize: MapCardSize;
  onDelete: (map: CampaignMapAsset) => void;
}

export function MapCard({
  map,
  campaignHandle,
  canManage,
  cardSize,
  onDelete,
}: MapCardProps) {
  const { flatPages } = useWiki();
  const title = mapDisplayTitle(map);
  const thumbUrl = mapAssetImageUrl(map.id, 'thumb');
  const linkedPage = map.linkedPage ?? null;
  const nestedCount = map.nestedChildMaps?.length ?? 0;
  const metaLine = `${map.width ?? '?'}×${map.height ?? '?'} · ${map.pinCount ?? 0} pins`;
  const compact = cardSize === 'compact';

  return (
    <article
      className={`flex flex-col overflow-hidden border border-border bg-surface/60 ${
        compact ? 'rounded-lg' : 'rounded-xl'
      }`}
    >
      <Link
        to={campaignPath(campaignHandle, 'maps', map.id)}
        className={`relative block overflow-hidden bg-[#1a1a1a] ${
          compact ? 'aspect-[5/4]' : 'aspect-[4/3]'
        }`}
      >
        <img
          src={thumbUrl}
          alt={title}
          className="size-full object-cover transition-transform hover:scale-[1.02]"
        />
        {nestedCount > 0 ? (
          <NestedMapsBadge count={nestedCount} className="absolute right-1.5 top-1.5" />
        ) : null}
      </Link>
      <div className={`flex flex-1 flex-col ${compact ? 'gap-2 p-2' : 'gap-3 p-4'}`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3
              className={`truncate font-semibold text-foreground ${
                compact ? 'text-sm' : 'text-base'
              }`}
              title={title}
            >
              {title}
            </h3>
            <ElevatedBrowseVisibilityChip
              pageVisibility={map.visibility}
              showWhenElevated={canManage}
              compact
            />
          </div>
          {linkedPage ? (
            <LinkedLocationLine
              campaignHandle={campaignHandle}
              linkedPage={linkedPage}
              flatPages={flatPages}
              compact={compact}
            />
          ) : null}
          <p className={`text-muted ${compact ? 'mt-0.5 text-[10px]' : 'mt-1 text-xs'}`}>
            {metaLine}
          </p>
        </div>
        <MapCardActions
          campaignHandle={campaignHandle}
          map={map}
          canManage={canManage}
          compact={compact}
          onDelete={onDelete}
        />
      </div>
    </article>
  );
}

function LinkedLocationLine({
  campaignHandle,
  linkedPage,
  flatPages,
  compact,
}: {
  campaignHandle: string;
  linkedPage: { id: string; title: string };
  flatPages: ReturnType<typeof useWiki>['flatPages'];
  compact?: boolean;
}) {
  return (
    <Link
      to={campaignWikiPath(campaignHandle, linkedPage.id, flatPages)}
      className={`mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-primary hover:underline ${
        compact ? 'text-[10px]' : 'text-xs'
      }`}
      title={`Location: ${linkedPage.title}`}
      onClick={(event) => event.stopPropagation()}
    >
      <MapPin className="size-3 shrink-0" />
      <span className="truncate">{linkedPage.title}</span>
    </Link>
  );
}

function NestedMapsBadge({
  count,
  compact,
  className = '',
}: {
  count: number;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-black/70 px-1.5 py-0.5 font-medium text-white backdrop-blur-sm ${
        compact ? 'text-[10px]' : 'text-xs'
      } ${className}`}
      title={`${count} nested map${count === 1 ? '' : 's'} behind this map`}
    >
      <Layers className={compact ? 'size-3' : 'size-3.5'} />
      {count}
    </span>
  );
}

function MapCardActions({
  campaignHandle,
  map,
  canManage,
  compact,
  onDelete,
}: {
  campaignHandle: string;
  map: CampaignMapAsset;
  canManage: boolean;
  compact?: boolean;
  onDelete: (map: CampaignMapAsset) => void;
}) {
  const btnClass = compact
    ? 'rounded px-2 py-1 text-[11px]'
    : 'rounded-md px-3 py-1.5 text-sm';

  return (
    <div className="flex flex-wrap gap-1.5">
      <Link
        to={campaignPath(campaignHandle, 'maps', map.id)}
        className={`${btnClass} bg-accent text-accent-foreground`}
      >
        Open
      </Link>
      {canManage ? (
        <>
          <Link
            to={campaignPath(campaignHandle, 'maps', map.id, 'settings')}
            className={`inline-flex items-center gap-1 border border-border hover:bg-muted/10 ${btnClass}`}
          >
            <Settings className={compact ? 'size-3' : 'size-3.5'} />
            {compact ? null : 'Settings'}
          </Link>
          <button
            type="button"
            className={`inline-flex items-center gap-1 border border-red-900/40 text-red-400 hover:bg-red-950/40 ${btnClass}`}
            onClick={() => onDelete(map)}
          >
            <Trash2 className={compact ? 'size-3' : 'size-3.5'} />
            {compact ? null : 'Delete'}
          </button>
        </>
      ) : null}
    </div>
  );
}
