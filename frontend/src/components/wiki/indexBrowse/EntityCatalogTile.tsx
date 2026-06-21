import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
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

interface EntityCatalogTileProps {
  child: CategoryIndexChild;
  categoryPageId: string;
  categoryTitle: string;
  campaignHandle: string;
  pageById: Map<string, WikiTreeNode>;
}

export function EntityCatalogTile({
  child,
  categoryPageId,
  categoryTitle,
  campaignHandle,
  pageById,
}: EntityCatalogTileProps) {
  const { flatPages } = useWiki();
  const isDMUser = useElevatedNarrativeView();
  const [expanded, setExpanded] = useState(false);
  const isCharactersCategory = categoryTitle === 'Characters';
  const columnDefs = getCategoryColumnDefs(categoryTitle);
  const { primary, secondary } = catalogFieldsForTile(columnDefs);
  const displayMetadata = getDisplayMetadata(child.metadata, categoryTitle);
  const metadataMap = new Map(displayMetadata.map((field) => [field.key, field.value]));

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

  return (
    <Link
      to={campaignCategoryChildPath(campaignHandle, child.id, categoryTitle, flatPages)}
      className="region-depth-3 group flex min-w-0 flex-col rounded-md p-5 transition-all hover:bg-focal-elevated"
    >
      <FileText className="mb-3 size-6 text-primary/70 group-hover:text-primary" />
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
      {(locationAncestors.length > 0 || locationTrailLabel) && !isCharactersCategory ? (
        <div className="mt-1 min-w-0">
          <LocationTrailChips
            ancestors={locationAncestors}
            trailLabel={locationTrailLabel}
          />
        </div>
      ) : null}

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
    </Link>
  );
}
