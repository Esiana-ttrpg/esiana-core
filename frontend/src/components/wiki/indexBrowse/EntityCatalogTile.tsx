import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, MapPin } from 'lucide-react';
import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import { getCategoryColumnDefs } from '@/lib/metadataConfig';
import {
  catalogFieldsForTile,
  formatIndexCellDisplay,
} from '@/lib/contentPriorityCollapse';
import { getDisplayMetadata } from '@/lib/wikiMetadata';
import { formatIndexLocationTrail } from '@/lib/wiki';
import type { CategoryIndexChild } from '@/lib/wiki';
import { LocationTrailChips } from '@/components/wiki/LocationTrailChips';
import type { WikiTreeNode } from '@/types/wiki';
import { parseCharacterMetadata } from '@/lib/characterMetadata';
import { parseCharacterLineageMetadata } from '@/lib/characterLineageMetadata';
import { resolveCharacterStatus } from '@/lib/characterMetadata';
import { formatCharacterDisplayName } from '@/lib/characterDisplayName';
import { NarrativeStatusBadge } from '@/components/wiki/NarrativeStatusBadge';
import { DiscoveryStateBadge } from '@/components/wiki/indexBrowse/CategoryIndexDiscoveryBanner';
import { BrowseVisibilityIndicator } from '@/components/narrative/VisibilityTierChip';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';
import { CharacterLifeStatusBadge } from '@/components/entity/CharacterLifeStatusBadge';
import { buildLocationBrowseRow } from '@/lib/locationBrowseProjection';

interface EntityCatalogTileProps {
  child: CategoryIndexChild;
  categoryPageId: string;
  categoryTitle: string;
  campaignHandle: string;
  pageById: Map<string, WikiTreeNode>;
  allIndexChildren?: CategoryIndexChild[];
}

function readLocationPortraitUrl(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const appearance = (metadata as Record<string, unknown>).appearance;
  if (!appearance || typeof appearance !== 'object') return null;
  const url = (appearance as { portraitUrl?: unknown }).portraitUrl;
  if (typeof url !== 'string' || !url.trim()) return null;
  return url.trim();
}

export function EntityCatalogTile({
  child,
  categoryPageId,
  categoryTitle,
  campaignHandle,
  pageById,
  allIndexChildren,
}: EntityCatalogTileProps) {
  const { flatPages } = useWiki();
  const isDMUser = useElevatedNarrativeView();
  const [expanded, setExpanded] = useState(false);
  const isCharactersCategory = categoryTitle === 'Characters';
  const isLocationsCategory = categoryTitle === 'Locations';
  const columnDefs = getCategoryColumnDefs(categoryTitle);
  const { primary, secondary } = catalogFieldsForTile(columnDefs);
  const displayMetadata = getDisplayMetadata(child.metadata, categoryTitle);
  const metadataMap = new Map(displayMetadata.map((field) => [field.key, field.value]));

  const locationBrowseRow = useMemo(() => {
    if (!isLocationsCategory) return null;
    return buildLocationBrowseRow(child, {
      categoryPageId,
      allIndexChildren: allIndexChildren ?? [child],
      flatPages,
      pageById,
    });
  }, [
    isLocationsCategory,
    child,
    categoryPageId,
    allIndexChildren,
    flatPages,
    pageById,
  ]);

  const characterIdentity = isCharactersCategory
    ? parseCharacterMetadata(child.metadata)
    : null;
  const characterLineage = isCharactersCategory
    ? parseCharacterLineageMetadata(child.metadata)
    : null;
  const characterStatus =
    characterIdentity && characterLineage
      ? resolveCharacterStatus(characterIdentity, characterLineage)
      : null;
  const displayName = characterIdentity
    ? formatCharacterDisplayName(child.title, characterIdentity.appearance.pronouns)
    : null;

  const locationTrailLabel =
    child.locationTrailLabel ??
    formatIndexLocationTrail(child, categoryPageId, categoryTitle, pageById);
  const locationAncestors = child.locationAncestors ?? [];

  const hiddenCount = displayMetadata.length - primary.length - (expanded ? secondary.length : 0);

  const locationPortraitUrl = isLocationsCategory
    ? readLocationPortraitUrl(child.metadata)
    : null;

  const locationLeadVisual = isLocationsCategory ? (
    locationPortraitUrl ? (
      <img
        src={locationPortraitUrl}
        alt=""
        className="mb-3 size-12 rounded-md object-cover"
      />
    ) : (
      <MapPin className="mb-3 size-6 text-primary/70 group-hover:text-primary" />
    )
  ) : (
    <FileText className="mb-3 size-6 text-primary/70 group-hover:text-primary" />
  );

  return (
    <Link
      to={campaignCategoryChildPath(campaignHandle, child.id, categoryTitle, flatPages)}
      className="region-depth-3 group flex min-w-0 flex-col rounded-md p-5 transition-all hover:bg-focal-elevated"
    >
      {locationLeadVisual}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 className="font-semibold text-focal-foreground group-hover:text-primary break-words">
          {displayName?.primary ?? child.title}
          {displayName?.pronounSuffix ? (
            <span className="ml-1 text-sm font-normal text-muted">
              ({displayName.pronounSuffix})
            </span>
          ) : null}
        </h3>
        {child.narrativeStatus ? (
          <NarrativeStatusBadge narrativeStatus={child.narrativeStatus} compact />
        ) : characterStatus ? (
          <CharacterLifeStatusBadge status={characterStatus} compact />
        ) : null}
        <DiscoveryStateBadge discovery={child.discovery} surface="browse" compact />
        <BrowseVisibilityIndicator
          pageVisibility={child.visibility}
          narrativeStatus={child.narrativeStatus?.status ?? null}
          showWhenElevated={isDMUser}
          compact
        />
      </div>
      {isLocationsCategory && locationBrowseRow?.snippet ? (
        <p className="mt-2 line-clamp-3 text-sm text-muted">{locationBrowseRow.snippet}</p>
      ) : null}
      {(locationAncestors.length > 0 || locationTrailLabel) && !isCharactersCategory ? (
        <div className="mt-1 min-w-0">
          <LocationTrailChips
            ancestors={locationAncestors}
            trailLabel={locationTrailLabel}
          />
        </div>
      ) : null}

      {isLocationsCategory && locationBrowseRow ? (
        <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
          {locationBrowseRow.type ? (
            <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-focal-elevated/80 px-2 py-0.5 text-xs text-focal-foreground">
              <span className="text-muted">Type</span>
              <span className="break-words font-medium">{locationBrowseRow.type}</span>
            </span>
          ) : null}
          {locationBrowseRow.status ? (
            <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-focal-elevated/80 px-2 py-0.5 text-xs text-focal-foreground">
              <span className="text-muted">Status</span>
              <span className="break-words font-medium">{locationBrowseRow.status}</span>
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 flex min-w-0 flex-wrap gap-1.5">
          {primary.map((col) => {
            const value = formatIndexCellDisplay(metadataMap.get(col.key));
            if (!value) return null;
            return (
              <span
                key={col.key}
                className="inline-flex max-w-full items-center gap-1 rounded-md bg-focal-elevated/80 px-2 py-0.5 text-xs text-focal-foreground"
              >
                <span className="text-muted">{col.key}</span>
                <span className="break-words font-medium">{value}</span>
              </span>
            );
          })}
          {expanded
            ? secondary.map((col) => {
                const value = formatIndexCellDisplay(metadataMap.get(col.key));
                if (!value) return null;
                return (
                  <span
                    key={col.key}
                    className="inline-flex max-w-full items-center gap-1 rounded-md bg-surface/60 px-2 py-0.5 text-xs text-muted"
                  >
                    <span>{col.key}</span>
                    <span className="break-words">{value}</span>
                  </span>
                );
              })
            : null}
          {!expanded && secondary.some((col) => formatIndexCellDisplay(metadataMap.get(col.key))) ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExpanded(true);
              }}
              className="rounded-md px-2 py-0.5 text-xs text-primary hover:bg-primary/10"
            >
              + more
            </button>
          ) : null}
          {expanded && hiddenCount > 0 ? (
            <span className="px-2 py-0.5 text-xs text-muted">+{hiddenCount} more</span>
          ) : null}
        </div>
      )}
      {isLocationsCategory && locationBrowseRow?.keyConnections ? (
        <p className="mt-2 text-xs text-muted">{locationBrowseRow.keyConnections}</p>
      ) : null}
    </Link>
  );
}
