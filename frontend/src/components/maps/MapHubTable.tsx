import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { Link } from 'react-router-dom';
import { MapPin, Settings, Trash2 } from 'lucide-react';
import type { CampaignMapAsset } from '@/types/maps';
import { mapDisplayTitle } from '@/types/maps';
import { mapAssetImageUrl } from '@/lib/maps';
import {
  buildMapHubTableRows,
  formatMapHubBreadcrumb,
  type MapHubTableRow,
} from '@/lib/mapHubLayout';
import { campaignPath, campaignWikiPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import { ElevatedBrowseVisibilityChip } from '@/components/narrative/VisibilityTierChip';

interface MapHubTableProps {
  maps: CampaignMapAsset[];
  campaignHandle: string;
  canManage: boolean;
  onDelete: (map: CampaignMapAsset) => void;
}

export function MapHubTable({
  maps,
  campaignHandle,
  canManage,
  onDelete,
}: MapHubTableProps) {
  const { flatPages } = useWiki();
  const rows = buildMapHubTableRows(maps);

  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-elevated/40 text-left META_SECTION_LABEL_CLASS">
            <th className="px-3 py-2.5">Map</th>
            <th className="hidden px-3 py-2.5 sm:table-cell">Location</th>
            <th className="px-3 py-2.5">Size</th>
            <th className="px-3 py-2.5">Pins</th>
            <th className="px-3 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <MapHubTableRowView
              key={row.map.id}
              row={row}
              campaignHandle={campaignHandle}
              flatPages={flatPages}
              canManage={canManage}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MapHubTableRowView({
  row,
  campaignHandle,
  flatPages,
  canManage,
  onDelete,
}: {
  row: MapHubTableRow;
  campaignHandle: string;
  flatPages: ReturnType<typeof useWiki>['flatPages'];
  canManage: boolean;
  onDelete: (map: CampaignMapAsset) => void;
}) {
  const { map, breadcrumb, depth } = row;
  const title = mapDisplayTitle(map);
  const thumbUrl = mapAssetImageUrl(map.id, 'thumb');
  const linkedPage = map.linkedPage ?? null;
  const breadcrumbLabel = formatMapHubBreadcrumb(breadcrumb);
  const isRoot = depth === 0;

  return (
    <tr
      className={`border-b border-border/60 last:border-b-0 ${
        isRoot ? 'bg-surface/50' : 'bg-surface/20'
      }`}
    >
      <td className="px-3 py-2.5">
        <div
          className="flex min-w-0 items-center gap-2.5"
          style={{ paddingLeft: `${depth * 1.25}rem` }}
        >
          <img
            src={thumbUrl}
            alt=""
            className="size-10 shrink-0 rounded border border-border object-cover"
          />
          <div className="min-w-0">
            {depth > 0 ? (
              <div
                className="truncate text-[11px] text-muted"
                title={breadcrumbLabel}
              >
                {breadcrumb.slice(0, -1).map((entry) => entry.title).join(' / ')}
                {' / '}
              </div>
            ) : null}
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <Link
                to={campaignPath(campaignHandle, 'maps', map.id)}
                className={`block truncate hover:underline ${
                  isRoot ? 'font-semibold text-foreground' : 'font-medium text-foreground'
                }`}
                title={breadcrumbLabel}
              >
                {title}
              </Link>
              <ElevatedBrowseVisibilityChip
                pageVisibility={map.visibility}
                showWhenElevated={canManage}
                compact
              />
            </div>
            {linkedPage ? (
              <Link
                to={campaignWikiPath(campaignHandle, linkedPage.id, flatPages)}
                className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-xs text-primary hover:underline sm:hidden"
              >
                <MapPin className="size-3 shrink-0" />
                {linkedPage.title}
              </Link>
            ) : null}
          </div>
        </div>
      </td>
      <td className="hidden px-3 py-2.5 sm:table-cell">
        {linkedPage ? (
          <Link
            to={campaignWikiPath(campaignHandle, linkedPage.id, flatPages)}
            className="inline-flex max-w-[12rem] items-center gap-1 truncate text-primary hover:underline"
            title={linkedPage.title}
          >
            <MapPin className="size-3 shrink-0" />
            {linkedPage.title}
          </Link>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-muted">
        {map.width ?? '?'} × {map.height ?? '?'}
      </td>
      <td className="whitespace-nowrap px-3 py-2.5 text-muted">
        {map.pinCount ?? 0}
        {(map.nestedChildMaps?.length ?? 0) > 0 ? (
          <span className="ml-1 text-[11px] text-muted">
            (+{map.nestedChildMaps!.length} nested)
          </span>
        ) : null}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap justify-end gap-1.5">
          <Link
            to={campaignPath(campaignHandle, 'maps', map.id)}
            className="rounded px-2 py-1 text-xs bg-accent text-accent-foreground"
          >
            Open
          </Link>
          {canManage ? (
            <>
              <Link
                to={campaignPath(campaignHandle, 'maps', map.id, 'settings')}
                className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs hover:bg-muted/10"
              >
                <Settings className="size-3" />
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded border border-red-900/40 px-2 py-1 text-xs text-red-400 hover:bg-red-950/40"
                onClick={() => onDelete(map)}
              >
                <Trash2 className="size-3" />
              </button>
            </>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
