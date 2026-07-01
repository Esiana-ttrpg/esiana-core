import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Layout } from 'react-grid-layout';
import { WidgetRegistry } from './WidgetRegistry';
import { BlockFocusOverlay } from './BlockFocusOverlay';
import { WikiEditorialSurface } from './WikiEditorialSurface';
import { WikiLayoutGrid } from './WikiLayoutGrid';
import { WikiPageBlockShell } from './WikiPageBlockShell';
import type { WikiBlockVisibility, WikiPageBlock } from '@/types/wiki';
import {
  DEFAULT_BLOCK_DISPLAY_STATE,
  type BlockDisplayState,
} from '@/lib/blockDisplayState';
import {
  buildExpandedLayoutItems,
  useExpansionTransition,
} from '@/hooks/useExpansionTransition';
import { useBlockActions } from '@/hooks/useBlockActions';
import {
  buildEditorialReflowLayoutStaged,
  buildMeasuredCompactLayout,
  mergeLayoutGeometryOnly,
  resolveRuntimeBlockHeight,
} from '@/utils/wikiLayoutRuntime';
import { WIKI_GRID_COLS } from '@/utils/wikiGrid';
import {
  EVENT_LORE_DESCRIPTION_BLOCK_TITLE,
  findPrimaryDescriptionBlockId,
} from '@/lib/eventLoreWiki';
import { getBlockDisplayTitle, getDefaultBlockTitle } from '@/utils/wikiWidgets';
import type { CharacterIdentityProjection } from '@/lib/characterIdentityProjection';
import type { OrganizationIdentityProjection } from '@/lib/organizationIdentityProjection';
import type { FamilyIdentityProjection } from '@/lib/familyIdentityProjection';
import type { AncestryIdentityProjection } from '@/lib/ancestryIdentityProjection';
import type { BestiaryIdentityProjection } from '@/lib/bestiaryIdentityProjection';
import type { WorkspaceMode } from '@/lib/surfaceDensityProfile';
import {
  findPrimaryProseBlockId,
  getWorkspaceOrchestration,
  shouldForceEditorialStack,
  sortBlocksByWorkspacePriority,
} from '@/lib/workspaceOrchestration';
import { shouldPreferEditorialLayoutOnViewport } from '@/lib/viewportEditorial';
import { TYPE_PROSE_CLASS } from '@/lib/surfaceLayout';
import type { AppearanceCapabilities, SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import type { WikiTreeNode, WikiTag, WikiTagInput, WikiPageParentRef } from '@/types/wiki';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

export type BlocksUpdater =
  | WikiPageBlock[]
  | ((previous: WikiPageBlock[]) => WikiPageBlock[]);

interface WikiPageRendererProps {
  blocks: WikiPageBlock[];
  templateType: string;
  isDMUser?: boolean;
  memberRole?: string;
  allowPlayerChronologyManagement?: boolean;
  isEditingPage?: boolean;
  /** @deprecated Use isEditingPage */
  isEditingLayout?: boolean;
  showGridLines: boolean;
  onShowGridLinesChange?: (show: boolean) => void;
  onBlocksChange: (updater: BlocksUpdater) => void;
  isDirty?: boolean;
  isSaving?: boolean;
  onSaveLayout?: () => void;
  isEventLorePage?: boolean;
  readerFirstLayout?: boolean;
  pageMetadata?: unknown;
  surfaceProfileKey?: SurfaceProfileKey | null;
  appearanceCapabilities?: AppearanceCapabilities;
  workspaceMode?: WorkspaceMode;
  campaignHandle?: string;
  pageId?: string;
  flatPages?: WikiTreeNode[];
  onMetadataSaved?: (metadata: Record<string, unknown>) => void;
  inspectorFocusField?: string | null;
  characterIdentityProjection?: CharacterIdentityProjection | null;
  organizationIdentityProjection?: OrganizationIdentityProjection | null;
  familyIdentityProjection?: FamilyIdentityProjection | null;
  bestiaryIdentityProjection?: BestiaryIdentityProjection | null;
  ancestryIdentityProjection?: AncestryIdentityProjection | null;
  headquartersId?: string | null;
  seatLocationId?: string | null;
  pageVisibility?: string;
  pageTags?: WikiTagInput[];
  allCampaignTags?: WikiTag[];
  parentId?: string | null;
  parentChain?: WikiPageParentRef | null;
  onVisibilityChange?: (visibility: 'Public' | 'Party' | 'DM_Only') => void | Promise<void>;
  onParentChange?: (next: {
    parentId: string | null;
    parent?: WikiPageParentRef | null;
  }) => void;
  onTreeRefresh?: () => Promise<void>;
  onPageTagsChange?: (tags: WikiTagInput[]) => void;
  blockDisplayState?: BlockDisplayState;
  onBlockDisplayChange?: (next: BlockDisplayState) => void;
  onJumpToContinuity?: (blockId: string) => void;
  canDeleteBlock?: (block: WikiPageBlock) => boolean;
}

export function WikiPageRenderer({
  blocks,
  templateType,
  isDMUser: isDMUserProp,
  memberRole,
  allowPlayerChronologyManagement = false,
  isEditingPage: isEditingPageProp,
  isEditingLayout,
  showGridLines,
  onShowGridLinesChange,
  onBlocksChange,
  isEventLorePage = false,
  readerFirstLayout = false,
  pageMetadata,
  surfaceProfileKey,
  appearanceCapabilities,
  workspaceMode = 'balanced',
  campaignHandle = '',
  pageId = '',
  flatPages = [],
  onMetadataSaved,
  inspectorFocusField,
  characterIdentityProjection,
  organizationIdentityProjection,
  familyIdentityProjection,
  bestiaryIdentityProjection,
  ancestryIdentityProjection,
  headquartersId,
  seatLocationId,
  pageVisibility = 'Party',
  pageTags = [],
  allCampaignTags = [],
  parentId = null,
  parentChain,
  onVisibilityChange,
  onParentChange,
  onTreeRefresh,
  onPageTagsChange,
  blockDisplayState = DEFAULT_BLOCK_DISPLAY_STATE,
  onBlockDisplayChange,
  onJumpToContinuity,
  canDeleteBlock,
}: WikiPageRendererProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const isEditingPage = isEditingPageProp ?? isEditingLayout ?? false;
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(960);
  const [interactionLockedBlockId, setInteractionLockedBlockId] = useState<string | null>(
    null,
  );
  const [measuredPxByBlock, setMeasuredPxByBlock] = useState<Record<string, number>>({});
  const heightDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const measureObserversRef = useRef<Map<string, ResizeObserver>>(new Map());
  const snapHeightsRef = useRef(false);

  const canEditWorkspace = isDMUser && isEditingPage;
  const showLayoutChrome = canEditWorkspace;
  /** Block grid visible when arrange mode is on during wiki edit. */
  const useLayoutGrid = canEditWorkspace && showGridLines;
  const useEditorialFlow = !useLayoutGrid;
  const showBlockLayoutChrome = showLayoutChrome && useLayoutGrid;
  const orchestration = useMemo(
    () => getWorkspaceOrchestration(workspaceMode),
    [workspaceMode],
  );
  const primaryDescriptionBlockId = useMemo(
    () => (isEventLorePage ? findPrimaryDescriptionBlockId(blocks) : null),
    [blocks, isEventLorePage],
  );

  function resolveBlockTitle(block: WikiPageBlock): string {
    if (isEventLorePage && block.id === primaryDescriptionBlockId) {
      return block.title?.trim() || EVENT_LORE_DESCRIPTION_BLOCK_TITLE;
    }
    return getBlockDisplayTitle(block);
  }

  function resolveBlockTitleInputValue(block: WikiPageBlock): string {
    if (block.title?.trim()) return block.title;
    if (isEventLorePage && block.id === primaryDescriptionBlockId) {
      return EVENT_LORE_DESCRIPTION_BLOCK_TITLE;
    }
    return getDefaultBlockTitle(block.type);
  }

  function getBlockFrameClassName(): string {
    if (!showBlockLayoutChrome) return 'bg-transparent';
    if (showGridLines) {
      return 'rounded-3xl border-2 border-dashed border-border bg-background/80 shadow-sm';
    }
    return 'rounded-3xl border-2 border-transparent bg-transparent';
  }

  useEffect(() => {
    const element = gridContainerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        setGridWidth(Math.floor(entry.contentRect.width));
      }
    });
    observer.observe(element);
    setGridWidth(Math.floor(element.getBoundingClientRect().width));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!canEditWorkspace || !showGridLines || !onShowGridLinesChange) return;
    if (shouldPreferEditorialLayoutOnViewport(gridWidth)) {
      onShowGridLinesChange(false);
    }
  }, [canEditWorkspace, gridWidth, onShowGridLinesChange, showGridLines]);

  function getBlockVisibility(block: WikiPageBlock): WikiBlockVisibility {
    if (block.visibility) return block.visibility;
    return block.isPrivate ? 'DM_Only' : 'Party';
  }

  function isBlockEmpty(block: WikiPageBlock): boolean {
    if (block.type === 'text-tiptap' || block.type === 'text-biography') {
      const md =
        typeof (block.content as { markdown?: string })?.markdown === 'string'
          ? (block.content as { markdown: string }).markdown
          : '';
      return md.trim().length === 0;
    }
    if (block.type === 'image-display') {
      const url =
        typeof (block.content as { imageUrl?: string })?.imageUrl === 'string'
          ? (block.content as { imageUrl: string }).imageUrl
          : '';
      return url.trim().length === 0;
    }
    if (block.type === 'stat-block') {
      const fields = Array.isArray((block.content as { fields?: unknown[] })?.fields)
        ? ((block.content as { fields: Array<{ value?: string }> }).fields)
        : [];
      if (fields.length === 0) return true;
      return fields.every((f) => {
        const value = typeof f?.value === 'string' ? f.value : '';
        return value.trim().length === 0;
      });
    }
    if (block.type === 'wiki-infobox') {
      const raw = (block.content as { fields?: unknown[] })?.fields;
      if (!Array.isArray(raw) || raw.length === 0) return true;
      return !raw.some((f) => {
        const row = f as { key?: string; value?: string };
        const key = typeof row?.key === 'string' ? row.key.trim() : '';
        const value = typeof row?.value === 'string' ? row.value.trim() : '';
        return key.length > 0 && value.length > 0;
      });
    }
    return false;
  }

  const layoutBlocks = useMemo(() => {
    const canView = (block: WikiPageBlock) =>
      isDMUser || getBlockVisibility(block) !== 'DM_Only';
    return blocks.filter(canView);
  }, [blocks, isDMUser]);

  const renderBlocks = useMemo(() => {
    const base = isEditingPage ? layoutBlocks : layoutBlocks.filter((b) => !isBlockEmpty(b));
    return sortBlocksByWorkspacePriority(base, workspaceMode);
  }, [layoutBlocks, isEditingPage, workspaceMode]);

  const useStackedMobileLayout =
    useEditorialFlow &&
    gridWidth > 0 &&
    shouldForceEditorialStack(workspaceMode, gridWidth, readerFirstLayout);

  const runtimeHeights = useMemo(() => {
    const heights: Record<string, number> = {};
    for (const block of renderBlocks) {
      heights[block.id] = resolveRuntimeBlockHeight(block, measuredPxByBlock[block.id], {
        showLayoutChrome: showBlockLayoutChrome,
        showReadTitle: !showBlockLayoutChrome,
      });
    }
    return heights;
  }, [renderBlocks, measuredPxByBlock, showBlockLayoutChrome]);

  const expansion = useExpansionTransition({
    blocks: renderBlocks,
    runtimeHeights,
    displayState: blockDisplayState,
    useStackedMobileLayout,
  });

  const blockActions = useBlockActions({
    blockDisplayState,
    onBlockDisplayChange,
    useEditorialFlow,
    orchestration,
    onJumpToContinuityOverride: onJumpToContinuity,
  });

  const layoutAnimating = expansion.layoutAnimating;
  const expandedLayoutBehavior = orchestration.expandedLayoutBehavior;
  const isExpandedLayout =
    useEditorialFlow &&
    blockDisplayState.scale === 'expanded' &&
    blockDisplayState.activeBlockId != null &&
    !useStackedMobileLayout &&
    expandedLayoutBehavior !== 'dense-grid';
  const layout: Layout[] = useMemo(() => {
    if (useStackedMobileLayout) {
      let yAcc = 0;
      return renderBlocks.map((block) => {
        const h = runtimeHeights[block.id] ?? block.h;
        const item: Layout = {
          i: block.id,
          x: 0,
          y: yAcc,
          w: WIKI_GRID_COLS,
          h,
          static: true,
        };
        yAcc += h;
        return item;
      });
    }
    if (isExpandedLayout && expandedLayoutBehavior === 'editorial-reflow') {
      const activeId = blockDisplayState.activeBlockId;
      if (!activeId) {
        return buildMeasuredCompactLayout(renderBlocks, runtimeHeights);
      }
      return buildEditorialReflowLayoutStaged(
        renderBlocks,
        activeId,
        runtimeHeights,
        (block) => expansion.getExpandedWidth(block),
      ).map((item) => ({
        ...item,
        static:
          interactionLockedBlockId === item.i ||
          blockDisplayState.scale === 'focused',
      }));
    }
    if (isExpandedLayout) {
      return buildExpandedLayoutItems(
        renderBlocks,
        runtimeHeights,
        blockDisplayState,
        expansion,
      );
    }
    return buildMeasuredCompactLayout(renderBlocks, runtimeHeights).map((item) => ({
      ...item,
      static:
        interactionLockedBlockId === item.i ||
        blockDisplayState.scale === 'focused',
    }));
  }, [
    renderBlocks,
    interactionLockedBlockId,
    useStackedMobileLayout,
    runtimeHeights,
    isExpandedLayout,
    expandedLayoutBehavior,
    blockDisplayState,
    expansion,
  ]);

  const handleBlockHeightChange = useCallback(
    (blockId: string, heightPx: number) => {
      if (snapHeightsRef.current) {
        setMeasuredPxByBlock((prev) =>
          prev[blockId] === heightPx ? prev : { ...prev, [blockId]: heightPx },
        );
        return;
      }
      const existing = heightDebounceRef.current[blockId];
      if (existing) clearTimeout(existing);
      heightDebounceRef.current[blockId] = setTimeout(() => {
        setMeasuredPxByBlock((prev) =>
          prev[blockId] === heightPx ? prev : { ...prev, [blockId]: heightPx },
        );
        delete heightDebounceRef.current[blockId];
      }, 75);
    },
    [],
  );

  useEffect(() => {
    return () => {
      Object.values(heightDebounceRef.current).forEach(clearTimeout);
      measureObserversRef.current.forEach((observer) => observer.disconnect());
      measureObserversRef.current.clear();
    };
  }, []);

  const attachBlockBodyMeasureRef = useCallback(
    (blockId: string) => (node: HTMLDivElement | null) => {
      const existing = measureObserversRef.current.get(blockId);
      if (existing) {
        existing.disconnect();
        measureObserversRef.current.delete(blockId);
      }
      if (!node) return;
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          handleBlockHeightChange(blockId, Math.ceil(entry.contentRect.height));
        }
      });
      observer.observe(node);
      measureObserversRef.current.set(blockId, observer);
      handleBlockHeightChange(blockId, Math.ceil(node.getBoundingClientRect().height));
    },
    [handleBlockHeightChange],
  );

  useEffect(() => {
    if (!layoutAnimating) return;
    snapHeightsRef.current = true;
    setMeasuredPxByBlock((prev) => ({ ...prev }));
    const t = window.setTimeout(() => {
      snapHeightsRef.current = false;
    }, 450);
    return () => window.clearTimeout(t);
  }, [layoutAnimating, blockDisplayState.scale, blockDisplayState.activeBlockId]);

  useEffect(() => {
    if (
      !useEditorialFlow ||
      blockDisplayState.scale !== 'expanded' ||
      !blockDisplayState.activeBlockId
    ) {
      return;
    }
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-codex-block-id="${blockDisplayState.activeBlockId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [
    useEditorialFlow,
    blockDisplayState.scale,
    blockDisplayState.activeBlockId,
  ]);

  const prevWorkspaceModeRef = useRef(workspaceMode);
  useEffect(() => {
    if (!onBlockDisplayChange || useLayoutGrid) return;

    const modeChanged = prevWorkspaceModeRef.current !== workspaceMode;
    prevWorkspaceModeRef.current = workspaceMode;

    if (orchestration.autoExpandProseBlock) {
      const proseId = findPrimaryProseBlockId(renderBlocks);
      if (proseId) {
        onBlockDisplayChange({
          activeBlockId: proseId,
          scale: orchestration.defaultProseDisplayScale,
        });
        return;
      }
    }

    if (modeChanged && !orchestration.autoExpandProseBlock) {
      onBlockDisplayChange(DEFAULT_BLOCK_DISPLAY_STATE);
    }
  }, [
    workspaceMode,
    useLayoutGrid,
    orchestration.autoExpandProseBlock,
    orchestration.defaultProseDisplayScale,
    renderBlocks,
    onBlockDisplayChange,
  ]);

  const handleLayoutChange = (nextLayout: Layout[]) => {
    if (interactionLockedBlockId || isExpandedLayout) return;
    onBlocksChange((previous) =>
      previous.map((block) => {
        const layoutItem = nextLayout.find((item) => item.i === block.id);
        if (!layoutItem) return block;
        return mergeLayoutGeometryOnly(block, layoutItem);
      }),
    );
  };

  const blockActionHandlersForWidgets =
    canEditWorkspace && useEditorialFlow
      ? {
          onExpandBlock: blockActions.onExpandBlock,
          onFocusBlock: blockActions.onFocusBlock,
          onJumpToContinuity: blockActions.onJumpToContinuity,
        }
      : undefined;

  const updateBlockContent = (
    blockId: string,
    newContent: Record<string, unknown>,
  ) => {
    onBlocksChange((previous) =>
      previous.map((block) =>
        block.id === blockId
          ? {
              ...block,
              content: newContent,
            }
          : block,
      ),
    );
  };

  const updateBlockVisibility = (blockId: string, next: WikiBlockVisibility) => {
    onBlocksChange((previous) =>
      previous.map((block) =>
        block.id === blockId
          ? {
              ...block,
              visibility: next,
              isPrivate: next === 'DM_Only',
            }
          : block,
      ),
    );
  };

  const deleteBlock = (blockId: string) => {
    onBlocksChange((previous) => {
      const target = previous.find((block) => block.id === blockId);
      if (target && canDeleteBlock && !canDeleteBlock(target)) {
        return previous;
      }
      return previous.filter((block) => block.id !== blockId);
    });
  };

  const updateBlockTitle = (blockId: string, title: string) => {
    onBlocksChange((previous) =>
      previous.map((block) =>
        block.id === blockId ? { ...block, title: title.trim() || undefined } : block,
      ),
    );
  };

  const stackEditorialVertically =
    useEditorialFlow &&
    (useStackedMobileLayout ||
      (isExpandedLayout && expandedLayoutBehavior === 'prose-stack'));

  const useReaderProse =
    stackEditorialVertically ||
    workspaceMode === 'focused' ||
    workspaceMode === 'immersive';

  const focusedBlock =
    blockDisplayState.scale === 'focused' && blockDisplayState.activeBlockId
      ? renderBlocks.find((b) => b.id === blockDisplayState.activeBlockId)
      : null;

  const dimNonActiveBlocks =
    useEditorialFlow &&
    (isExpandedLayout ||
      (expandedLayoutBehavior === 'dense-grid' &&
        blockDisplayState.scale === 'expanded' &&
        blockDisplayState.activeBlockId != null)) &&
    orchestration.dimInactiveBlocksOnExpand;

  function renderBlockShell(block: WikiPageBlock) {
    const dimmed =
      dimNonActiveBlocks && block.id !== blockDisplayState.activeBlockId;
    const isFocusedPlaceholder = Boolean(
      focusedBlock && block.id === focusedBlock.id,
    );
    const isActiveProse =
      blockDisplayState.activeBlockId === block.id &&
      blockDisplayState.scale !== 'compact' &&
      (block.type === 'text-biography' || block.type === 'text-tiptap');
    const showReadTitle = orchestration.showBlockTitlesRead && !isActiveProse;

    return (
      <WikiPageBlockShell
        block={block}
        showLayoutChrome={showBlockLayoutChrome}
        showReadTitle={showReadTitle}
        frameClassName={getBlockFrameClassName()}
        dimmed={dimmed}
        readTitle={resolveBlockTitle(block)}
        titleInputValue={resolveBlockTitleInputValue(block)}
        visibility={getBlockVisibility(block)}
        focusedPlaceholder={isFocusedPlaceholder}
        measureRef={attachBlockBodyMeasureRef(block.id)}
        onTitleChange={(title) => updateBlockTitle(block.id, title)}
        onVisibilityChange={(next) => updateBlockVisibility(block.id, next)}
        onDelete={() => deleteBlock(block.id)}
        onInteractionStart={() => setInteractionLockedBlockId(block.id)}
        onInteractionEnd={() =>
          setInteractionLockedBlockId((current) =>
            current === block.id ? null : current,
          )
        }
      >
        {renderBlockWidget(block)}
      </WikiPageBlockShell>
    );
  }

  function renderBlockWidget(block: WikiPageBlock) {
    return (
      <WidgetRegistry
        block={block}
        isEditingPage={canEditWorkspace}
        showLayoutChrome={showBlockLayoutChrome}
        onChange={(newContent) => updateBlockContent(block.id, newContent)}
        templateType={templateType}
        pageMetadata={pageMetadata}
        surfaceProfileKey={surfaceProfileKey}
        appearanceCapabilities={appearanceCapabilities}
        workspaceMode={workspaceMode}
        campaignHandle={campaignHandle}
        pageId={pageId}
        flatPages={flatPages}
        memberRole={memberRole}
        allowPlayerChronologyManagement={allowPlayerChronologyManagement}
        onMetadataSaved={
          onMetadataSaved ??
          (() => {
            /* template workspace */
          })
        }
        focusField={inspectorFocusField}
        characterIdentityProjection={characterIdentityProjection}
        organizationIdentityProjection={organizationIdentityProjection}
        familyIdentityProjection={familyIdentityProjection}
        bestiaryIdentityProjection={bestiaryIdentityProjection}
        ancestryIdentityProjection={ancestryIdentityProjection}
        headquartersId={headquartersId}
        seatLocationId={seatLocationId}
        pageVisibility={pageVisibility}
        pageTags={pageTags}
        allCampaignTags={allCampaignTags}
        parentId={parentId}
        parentChain={parentChain}
        onVisibilityChange={onVisibilityChange}
        onParentChange={onParentChange}
        onTreeRefresh={onTreeRefresh}
        onPageTagsChange={onPageTagsChange}
        onInteractionStart={() => setInteractionLockedBlockId(block.id)}
        onInteractionEnd={() =>
          setInteractionLockedBlockId((current) =>
            current === block.id ? null : current,
          )
        }
        blockDisplayState={blockDisplayState}
        blockActionHandlers={blockActionHandlersForWidgets}
      />
    );
  }

  return (
    <div
      className={`wiki-page-renderer w-full min-w-0 ${TYPE_PROSE_CLASS} wiki-reader-prose space-y-4 wiki-workspace-${workspaceMode}`}
      data-workspace-mode={workspaceMode}
    >
      {focusedBlock && onBlockDisplayChange ? (
        <BlockFocusOverlay
          blockId={focusedBlock.id}
          title={resolveBlockTitle(focusedBlock)}
          isOpen
          onClose={blockActions.onCloseFocus ?? (() => {})}
          onCollapseToExpanded={
            blockActions.onCollapseFocusToExpanded ?? (() => {})
          }
        >
          {renderBlockWidget(focusedBlock)}
        </BlockFocusOverlay>
      ) : null}

      <div ref={gridContainerRef} className="w-full min-w-0">
        {useEditorialFlow ? (
          <WikiEditorialSurface
            blocks={renderBlocks}
            layout={layout}
            stackVertically={stackEditorialVertically}
            readerProse={useReaderProse}
            silentWorkSurface={useReaderProse || isEditingPage}
            expandedLayoutBehavior={
              stackEditorialVertically ? 'prose-stack' : expandedLayoutBehavior
            }
            layoutPhase={expansion.phase}
            activeBlockId={blockDisplayState.activeBlockId}
            layoutAnimating={layoutAnimating}
            dimInactiveBlocks={dimNonActiveBlocks}
            renderBlock={renderBlockShell}
          />
        ) : (
          <WikiLayoutGrid
            layout={layout}
            gridWidth={gridWidth}
            layoutAnimating={layoutAnimating}
            isExpandedLayout={isExpandedLayout}
            showLayoutChrome={showBlockLayoutChrome}
            onLayoutChange={handleLayoutChange}
          >
            {renderBlocks.map((block) => {
              const layoutItem = layout.find((item) => item.i === block.id);
              return (
                <div
                  key={block.id}
                  data-grid={{
                    x: layoutItem?.x ?? block.x,
                    y: layoutItem?.y ?? block.y,
                    w: layoutItem?.w ?? block.w,
                    h: layoutItem?.h ?? block.h,
                    minW: 1,
                    maxW: WIKI_GRID_COLS,
                    minH: 1,
                    static:
                      interactionLockedBlockId === block.id ||
                      blockDisplayState.scale === 'focused',
                  }}
                >
                  {renderBlockShell(block)}
                </div>
              );
            })}
          </WikiLayoutGrid>
        )}
      </div>

      {!isDMUser && !renderBlocks.length && (
        <div className="rounded-xl border border-border bg-background/70 p-6 text-center text-sm text-muted">
          No visible widgets are published on this page.
        </div>
      )}

      {showBlockLayoutChrome && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 px-4">
          <div className="rounded-xl border border-border/80 bg-surface px-4 py-3 text-sm text-foreground shadow-2xl">
            {showGridLines
              ? 'Arrange mode: drag blocks by the handle to reposition. Turn off the grid toggle for editorial expand/focus editing.'
              : 'Editorial mode: expand or focus blocks for deep editing. Turn on the grid toggle to drag block positions.'}
          </div>
        </div>
      )}
    </div>
  );
}
