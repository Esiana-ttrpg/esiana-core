import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Edit, FileText, Pencil, X } from 'lucide-react';
import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import { getCategoryColumnDefs } from '@/lib/metadataConfig';
import {
  countHiddenColumnsForViewport,
  formatIndexCellDisplay,
  visibleColumnsForViewport,
} from '@/lib/contentPriorityCollapse';
import { getDisplayMetadata } from '@/lib/wikiMetadata';
import { formatIndexLocationTrail, updateWikiPageMetadataField } from '@/lib/wiki';
import type { CategoryIndexChild } from '@/lib/wiki';
import { CharacterIndexTitleCell } from '@/components/wiki/indexBrowse/CharacterIndexTitleCell';
import { BestiaryIndexTitleCell } from '@/components/bestiary/BestiaryIndexTitleCell';
import {
  parseCharacterMetadata,
  readCharacterIndexIds,
  resolveCharacterStatus,
} from '@/lib/characterMetadata';
import { parseCharacterLineageMetadata } from '@/lib/characterLineageMetadata';
import {
  CharacterLifeStatusBadge,
  getCharacterLifeStatusRowClass,
} from '@/components/entity/CharacterLifeStatusBadge';
import { NarrativeStatusBadge } from '@/components/wiki/NarrativeStatusBadge';
import { DiscoveryStateBadge } from '@/components/wiki/indexBrowse/CategoryIndexDiscoveryBanner';
import type { WikiTreeNode } from '@/types/wiki';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';
import { VisibilityTierChip } from '@/components/narrative/VisibilityTierChip';
import { resolveVisibilityTierLabel } from '@/lib/campaignAffordances';

interface IndexGridViewProps {
  children: CategoryIndexChild[];
  categoryPageId: string;
  categoryTitle: string;
  campaignHandle: string;
  pageById: Map<string, WikiTreeNode>;
  onOpenCharacterSettings?: (pageId: string, focusField?: string) => void;
  /** Cast / bestiary hub — single-click row selects for preview rail, double-click opens page */
  selectedCharacterId?: string | null;
  onSelectCharacter?: (characterId: string) => void;
  isDMUser?: boolean;
}

type EditingCell = { pageId: string; column: string } | null;

const ENTITY_LINK_COLUMNS = new Set(['Affiliation', 'Family', 'Location']);
const CHARACTER_SETTINGS_COLUMNS = new Set([
  'Role',
  'Affiliation',
  'Family',
  'Status',
  'Location',
]);

function resolveEntityLinkHref(
  campaignHandle: string,
  column: string,
  pageId: string | null,
  flatPages: Parameters<typeof campaignCategoryChildPath>[3],
): string | null {
  if (!pageId) return null;
  if (column === 'Affiliation') {
    return campaignCategoryChildPath(campaignHandle, pageId, 'Organizations', flatPages);
  }
  if (column === 'Family') {
    return campaignCategoryChildPath(campaignHandle, pageId, 'Families', flatPages);
  }
  if (column === 'Location') {
    return campaignCategoryChildPath(campaignHandle, pageId, 'Locations', flatPages);
  }
  return null;
}

export function IndexGridView({
  children,
  categoryPageId,
  categoryTitle,
  campaignHandle,
  pageById,
  onOpenCharacterSettings,
  selectedCharacterId = null,
  onSelectCharacter,
  isDMUser: isDMUserProp = false,
}: IndexGridViewProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const { flatPages } = useWiki();
  const navigate = useNavigate();
  const [rows, setRows] = useState(children);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editingValue, setEditingValue] = useState('');
  const [savingCell, setSavingCell] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280,
  );

  const isCharactersCategory = categoryTitle === 'Characters';
  const isBestiaryCategory = categoryTitle === 'Bestiary';
  const hubPreviewMode =
    Boolean(onSelectCharacter) &&
    (isCharactersCategory || isBestiaryCategory);
  const allColumnDefs = useMemo(
    () => getCategoryColumnDefs(categoryTitle),
    [categoryTitle],
  );

  useEffect(() => {
    setRows(children);
  }, [children]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const metadataColumns = visibleColumnsForViewport(allColumnDefs, viewportWidth).map(
    (col) => col.key,
  );
  const hiddenColumnCount = countHiddenColumnsForViewport(allColumnDefs, viewportWidth);

  function startEditing(pageId: string, column: string, value: string) {
    if (isCharactersCategory && CHARACTER_SETTINGS_COLUMNS.has(column)) {
      onOpenCharacterSettings?.(pageId, columnToFocusField(column));
      return;
    }
    setEditingCell({ pageId, column });
    setEditingValue(value);
  }

  function columnToFocusField(column: string): string {
    switch (column) {
      case 'Role':
        return 'title';
      case 'Affiliation':
        return 'primaryAffiliationId';
      case 'Family':
        return 'familyId';
      case 'Status':
        return 'status';
      case 'Location':
        return 'currentLocationId';
      default:
        return column.toLowerCase();
    }
  }

  function cancelEditing() {
    setEditingCell(null);
  }

  async function saveEditing(pageId: string, column: string) {
    if (savingCell) return;
    setSavingCell(true);

    try {
      const result = await updateWikiPageMetadataField(
        campaignHandle,
        pageId,
        column,
        editingValue,
      );

      setRows((prevRows) =>
        prevRows.map((row) =>
          row.id === pageId
            ? {
                ...row,
                metadata: result.metadata,
              }
            : row,
        ),
      );
      setEditingCell(null);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Unable to save metadata');
    } finally {
      setSavingCell(false);
    }
  }

  return (
    <div className="region-depth-3 min-w-0 rounded-md">
      {hiddenColumnCount > 0 ? (
        <p className="mb-2 text-xs text-muted">
          Some columns hidden at this width — switch to card view or widen the window.
        </p>
      ) : null}
      <table className="operator-index-table w-full">
        <colgroup>
          <col className="operator-index-table__col-name" />
          {metadataColumns.map((column) => (
            <col key={column} className="operator-index-table__col-meta" />
          ))}
          <col className="operator-index-table__col-updated" />
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-elevated/50">
            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
              {isCharactersCategory ? 'Name' : 'Title'}
            </th>
            {metadataColumns.map((column) => (
              <th
                key={column}
                className="px-4 py-3 text-left text-sm font-semibold text-foreground"
              >
                {column}
              </th>
            ))}
            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
              Updated
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((child, idx) => {
            const metadata = getDisplayMetadata(child.metadata, categoryTitle);
            const metadataMap = new Map(metadata.map((field) => [field.key, field.value]));

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
            const indexIds = isCharactersCategory
              ? readCharacterIndexIds(child.metadata)
              : null;

            const isSelected =
              hubPreviewMode && selectedCharacterId === child.id;

            return (
              <tr
                key={child.id}
                aria-selected={hubPreviewMode ? isSelected : undefined}
                onClick={
                  hubPreviewMode
                    ? () => onSelectCharacter?.(child.id)
                    : undefined
                }
                onDoubleClick={
                  hubPreviewMode
                    ? () =>
                        navigate(
                          campaignCategoryChildPath(
                            campaignHandle,
                            child.id,
                            categoryTitle,
                            flatPages,
                          ),
                        )
                    : undefined
                }
                className={`border-b border-border transition-colors ${
                  hubPreviewMode ? 'cursor-pointer' : ''
                } ${
                  isSelected
                    ? 'bg-primary/10 hover:bg-primary/15'
                    : 'hover:bg-elevated/40'
                } ${idx % 2 === 0 && !isSelected ? 'bg-surface/20' : ''} ${
                  characterStatus ? getCharacterLifeStatusRowClass(characterStatus) : ''
                }`}
              >
                <td className="min-w-0 px-4 py-3 align-top">
                  <div className="flex min-w-0 flex-wrap items-start gap-2">
                    {isBestiaryCategory ? (
                      <BestiaryIndexTitleCell
                        child={child}
                        previewMode={hubPreviewMode}
                      />
                    ) : isCharactersCategory && characterIdentity ? (
                      <CharacterIndexTitleCell
                        campaignHandle={campaignHandle}
                        categoryTitle={categoryTitle}
                        pageId={child.id}
                        title={child.title}
                        pronouns={characterIdentity.appearance.pronouns}
                        knownFor={characterIdentity.knownFor}
                        previewMode={hubPreviewMode}
                      />
                    ) : (
                      <Link
                        to={campaignCategoryChildPath(
                          campaignHandle,
                          child.id,
                          categoryTitle,
                          flatPages,
                        )}
                        className="flex min-w-0 items-start gap-2 text-sm font-medium text-primary hover:text-primary"
                      >
                        <FileText className="mt-0.5 size-4 shrink-0" />
                        <span className="break-words">{child.title}</span>
                      </Link>
                    )}
                    <DiscoveryStateBadge discovery={child.discovery} surface="browse" compact />
                    <VisibilityTierChip
                      tier={resolveVisibilityTierLabel({
                        pageVisibility: child.visibility,
                        narrativeStatus: child.narrativeStatus?.status ?? null,
                      })}
                      compact
                    />
                    {child.narrativeStatus ? (
                      <NarrativeStatusBadge
                        narrativeStatus={child.narrativeStatus}
                        compact
                      />
                    ) : characterStatus ? (
                      <CharacterLifeStatusBadge status={characterStatus} compact />
                    ) : null}
                  </div>
                </td>
                {metadataColumns.map((column) => {
                  const rawValue = metadataMap.get(column) ?? '';
                  const displayValue = formatIndexCellDisplay(rawValue);
                  const isEditing =
                    editingCell?.pageId === child.id &&
                    editingCell.column === column;

                  const entityPageId =
                    column === 'Affiliation'
                      ? indexIds?.primaryAffiliationId
                      : column === 'Family'
                        ? indexIds?.familyId
                        : column === 'Location'
                          ? indexIds?.currentLocationId
                          : null;
                  const entityHref =
                    ENTITY_LINK_COLUMNS.has(column) &&
                    entityPageId &&
                    displayValue
                      ? resolveEntityLinkHref(
                          campaignHandle,
                          column,
                          entityPageId,
                          flatPages,
                        )
                      : null;

                  return (
                    <td key={column} className="min-w-0 px-4 py-3 align-top text-sm text-foreground">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                void saveEditing(child.id, column);
                              }
                              if (event.key === 'Escape') {
                                cancelEditing();
                              }
                            }}
                            className="min-w-[150px] rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary/60"
                          />
                          <button
                            type="button"
                            onClick={() => void saveEditing(child.id, column)}
                            disabled={savingCell}
                            className="rounded-lg bg-primary px-2 py-1 text-background hover:bg-primary-hover disabled:opacity-50"
                          >
                            <Check className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="rounded-lg border border-border bg-elevated px-2 py-1 text-foreground hover:bg-elevated"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            startEditing(child.id, column, rawValue);
                          }}
                          className="flex w-full min-w-0 items-start justify-between gap-2 text-left text-sm text-foreground hover:text-primary"
                        >
                          {entityHref ? (
                            <Link
                              to={entityHref}
                              onClick={(e) => e.stopPropagation()}
                              className="min-w-0 break-words text-primary hover:underline"
                            >
                              {displayValue}
                            </Link>
                          ) : column === 'Status' && child.narrativeStatus ? (
                            <NarrativeStatusBadge
                              narrativeStatus={child.narrativeStatus}
                              compact
                            />
                          ) : column === 'Status' && characterStatus ? (
                            <CharacterLifeStatusBadge status={characterStatus} compact />
                          ) : (
                            <span className={displayValue ? 'min-w-0 break-words' : 'text-muted'}>
                              {displayValue ?? '—'}
                            </span>
                          )}
                          {isCharactersCategory && CHARACTER_SETTINGS_COLUMNS.has(column) ? (
                            <Pencil className="size-4 shrink-0 text-muted" />
                          ) : (
                            <Edit className="size-4 shrink-0 text-muted" />
                          )}
                        </button>
                      )}
                    </td>
                  );
                })}
                <td className="whitespace-nowrap px-4 py-3 align-top text-sm text-muted">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'short',
                  }).format(new Date(child.updatedAt))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
