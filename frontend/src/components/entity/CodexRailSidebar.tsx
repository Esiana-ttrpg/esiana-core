import { useCallback, useEffect, useMemo, useState } from 'react';
import { GripVertical, X, Link2, AlertTriangle, BookOpen, GitBranch } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import type { ContinuityIssue } from '@shared/continuityIssue';
import { WikiContinuityPanel } from '@/components/wiki/WikiContinuityPanel';
import { CodexDiscoverySection } from '@/components/entity/CodexDiscoverySection';
import { CodexDiscoveryReadStrip } from '@/components/entity/CodexDiscoveryReadStrip';
import { CodexNarrativeStatusSection } from '@/components/entity/CodexNarrativeStatusSection';
import { CodexLoreSourcesSection } from '@/components/entity/lore/CodexLoreSourcesSection';
import { CodexPartyLinkSection } from '@/components/entity/CodexPartyLinkSection';
import type { LorePageLookup } from '@/lib/resolveLoreSourceDisplay';
import type { PartyKnowledgeResponse } from '@/lib/loreKnowledgeApi';
import {
  CODEX_RAIL_CONTINUITY_ANCHOR_ID,
  resolveCodexRailHeaderSubtitle,
  resolveCodexRailSectionOrder,
  type CodexRailSectionKey,
  type CodexRailVariant,
  type PageContinuitySummary,
} from '@/lib/pageCodexDiagnostics';
import {
  clampInspectorWidth,
  INSPECTOR_WIDTH_EVENT,
  INSPECTOR_WIDTH_MAX,
  INSPECTOR_WIDTH_MIN,
  loadInspectorWidth,
  saveInspectorWidth,
} from '@/lib/inspectorWidthPreference';
import { fetchWikiBacklinks, fetchWikiOutlinks } from '@/lib/wiki';
import { formatWikiVisibilityLabel } from '@/lib/wikiPageHeaderMeta';
import { isCharacterWikiPage } from '@/lib/characterMetadata';
import type { WikiPageParentRef } from '@/types/wiki';
import type { WorkspaceMode } from '@/lib/surfaceDensityProfile';
import { getWorkspaceOrchestration } from '@/lib/workspaceOrchestration';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import type { UnresolvedWikilinkRow } from '@/lib/wikiLoreGraph';
import {
  SURFACE_CONTEXTUAL_CLASS,
  SURFACE_CONTEXTUAL_INLINE_CLASS,
  SURFACE_RECESSED_CLASS,
  TYPE_META_CLASS,
} from '@/lib/surfaceLayout';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

export type CodexRailLayout = 'overlay' | 'inline' | 'stacked';

export type CodexRailSurfaceMode = 'reading' | 'operational';

interface CodexRailSidebarProps {
  open: boolean;
  onClose: () => void;
  campaignHandle: string;
  pageId: string;
  pageTitle: string;
  templateType: string;
  pageMetadata?: unknown;
  pageVisibility: string;
  isDMUser?: boolean;
  isEditingPage: boolean;
  onVisibilityChange?: (next: 'Public' | 'Party' | 'DM_Only') => void;
  parentChain?: WikiPageParentRef | null;
  onFocusBlock?: (blockType: string, field?: string) => void;
  workspaceMode?: WorkspaceMode;
  onIdentityChanged?: () => void | Promise<void>;
  flatPages?: LorePageLookup[];
  memberRole?: string;
  allowPlayerChronologyManagement?: boolean;
  layout?: CodexRailLayout;
  surfaceMode?: CodexRailSurfaceMode;
  railVariant?: CodexRailVariant;
  continuitySummary?: PageContinuitySummary;
  sharedIssues?: ContinuityIssue[];
  sharedUnresolved?: UnresolvedWikilinkRow[];
  sharedDiagnosticsLoading?: boolean;
  onDiagnosticsReload?: () => void;
  discovery?: DiscoveryStateProjection | null;
  partyKnowledge?: PartyKnowledgeResponse | null;
  pulseContinuitySection?: boolean;
  railSectionOrder?: CodexRailSectionKey[];
  railSectionsHidden?: CodexRailSectionKey[];
}

function CodexRailSection({
  title,
  icon,
  children,
  compact,
  sectionId,
  pulse = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  compact?: boolean;
  sectionId?: string;
  pulse?: boolean;
}) {
  return (
    <section
      id={sectionId}
      className={`region-depth-1 rounded-md px-3 py-3 ${
        compact ? 'space-y-2' : 'space-y-3'
      } ${pulse ? 'codex-rail-continuity-pulse' : ''}`}
    >
      <h3 className={`${TYPE_META_CLASS} flex items-center gap-1.5 font-semibold uppercase tracking-wider text-contextual-foreground/85 opacity-75`}>
        {icon}
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function CodexRailBody({
  campaignHandle,
  pageId,
  pageTitle,
  templateType,
  pageMetadata,
  pageVisibility,
  isDMUser: isDMUserProp,
  isEditingPage,
  onVisibilityChange,
  parentChain,
  onFocusBlock,
  onIdentityChanged,
  flatPages = [],
  memberRole,
  allowPlayerChronologyManagement = false,
  railCompact,
  backlinkCount,
  mentionCount,
  showPartyLink,
  orchestrationLabel,
  scrollable = false,
  railVariant = 'balanced',
  continuitySummary,
  sharedIssues,
  sharedUnresolved,
  sharedDiagnosticsLoading,
  onDiagnosticsReload,
  discovery,
  partyKnowledge,
  pulseContinuitySection = false,
  railSectionOrder,
  railSectionsHidden = [],
}: {
  campaignHandle: string;
  pageId: string;
  pageTitle: string;
  templateType: string;
  pageMetadata?: unknown;
  pageVisibility: string;
  isDMUser?: boolean;
  isEditingPage: boolean;
  onVisibilityChange?: (next: 'Public' | 'Party' | 'DM_Only') => void;
  parentChain?: WikiPageParentRef | null;
  onFocusBlock?: (blockType: string, field?: string) => void;
  onIdentityChanged?: () => void | Promise<void>;
  flatPages?: LorePageLookup[];
  memberRole?: string;
  allowPlayerChronologyManagement?: boolean;
  railCompact: boolean;
  backlinkCount: number | null;
  mentionCount: number | null;
  showPartyLink: boolean;
  orchestrationLabel: string;
  scrollable?: boolean;
  railVariant?: CodexRailVariant;
  continuitySummary?: PageContinuitySummary;
  sharedIssues?: ContinuityIssue[];
  sharedUnresolved?: UnresolvedWikilinkRow[];
  sharedDiagnosticsLoading?: boolean;
  onDiagnosticsReload?: () => void;
  discovery?: DiscoveryStateProjection | null;
  partyKnowledge?: PartyKnowledgeResponse | null;
  pulseContinuitySection?: boolean;
  railSectionOrder?: CodexRailSectionKey[];
  railSectionsHidden?: CodexRailSectionKey[];
}) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const parentTitle = parentChain?.title;
  const sectionOrder = useMemo(() => {
    const base =
      railSectionOrder ?? resolveCodexRailSectionOrder(railVariant, isDMUser);
    const filtered = base.filter((key) => !railSectionsHidden.includes(key));
    if (isDMUser) return filtered;
    return filtered.filter(
      (key) =>
        key !== 'timeline' &&
        key !== 'continuity' &&
        key !== 'threads' &&
        key !== 'provenance' &&
        key !== 'discovery',
    );
  }, [isDMUser, railVariant, railSectionOrder, railSectionsHidden]);

  const openDiscoverySubview = () => onFocusBlock?.('entity-discovery');

  const sections: Record<string, React.ReactNode> = {
    callout: (
      <div key="callout" className="space-y-2">
        {railVariant === 'diagnostics' && continuitySummary?.hasAny ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
            {continuitySummary.totalIssueCount} continuity issue
            {continuitySummary.totalIssueCount === 1 ? '' : 's'} on this page.
          </p>
        ) : null}
        {railVariant === 'discovery' ? (
          <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-contextual-foreground/90">
            Party knowledge may need attention for this entry.
          </p>
        ) : null}
      </div>
    ),
    relations: (
      <CodexRailSection
        key="relations"
        title="Relations"
        icon={<Link2 className="size-3.5 text-primary" aria-hidden />}
        compact={railCompact}
      >
        {showPartyLink && isDMUser ? (
          <CodexPartyLinkSection
            campaignHandle={campaignHandle}
            pageId={pageId}
            isEditingPage={isEditingPage}
            railCompact={railCompact}
            onIdentityChanged={onIdentityChanged}
          />
        ) : null}
        {!isDMUser ? (
          <CodexDiscoveryReadStrip
            discovery={discovery}
            partyKnowledge={partyKnowledge}
            railCompact={railCompact}
            onViewDiscovery={openDiscoverySubview}
          />
        ) : null}
        <p className="text-xs text-contextual-foreground/80">
          {backlinkCount == null
            ? 'Loading…'
            : `${backlinkCount} pages link here · ${mentionCount ?? 0} mentions`}
        </p>
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => onFocusBlock?.('wiki-backlinks')}
        >
          View relations on page
        </button>
      </CodexRailSection>
    ),
    provenance: isDMUser ? (
      <CodexRailSection
        key="provenance"
        title="Provenance"
        icon={<BookOpen className="size-3.5 text-primary" aria-hidden />}
        compact={railCompact}
      >
        <CodexDiscoverySection
          campaignHandle={campaignHandle}
          pageId={pageId}
          railCompact={railCompact}
          partyKnowledge={partyKnowledge}
          partyKnowledgeLoading={sharedDiagnosticsLoading}
          onPartyKnowledgeChanged={onDiagnosticsReload}
          highlightDiscovery={railVariant === 'discovery'}
          onOpenDiscoverySubview={openDiscoverySubview}
        />
        <CodexNarrativeStatusSection
          campaignHandle={campaignHandle}
          pageId={pageId}
          templateType={templateType}
          pageMetadata={pageMetadata}
          railCompact={railCompact}
        />
        <CodexLoreSourcesSection
          campaignHandle={campaignHandle}
          pageId={pageId}
          templateType={templateType}
          flatPages={flatPages}
          memberRole={memberRole}
          allowPlayerChronologyManagement={allowPlayerChronologyManagement}
          railCompact={railCompact}
        />
        <dl className="space-y-2 text-xs text-contextual-foreground/90">
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-2">
            <dt className={TYPE_META_CLASS}>Access</dt>
            <dd>
              {isEditingPage && onVisibilityChange ? (
                <select
                  value={pageVisibility}
                  onChange={(e) =>
                    onVisibilityChange(
                      e.target.value as 'Public' | 'Party' | 'DM_Only',
                    )
                  }
                  className="max-w-full rounded-md border border-border/30 bg-canvas/40 px-2 py-0.5 text-xs text-contextual-foreground outline-none focus:border-primary/50"
                  aria-label="Page access"
                >
                  <option value="Public">Public</option>
                  <option value="Party">Party-visible</option>
                  <option value="DM_Only">DM only</option>
                </select>
              ) : (
                formatWikiVisibilityLabel(pageVisibility)
              )}
            </dd>
          </div>
          {parentTitle ? (
            <div className="flex justify-between gap-2">
              <dt className={TYPE_META_CLASS}>Parent</dt>
              <dd className="truncate">{parentTitle}</dd>
            </div>
          ) : null}
        </dl>
        {isEditingPage ? (
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => onFocusBlock?.('entity-document')}
          >
            Page settings on document block
          </button>
        ) : null}
      </CodexRailSection>
    ) : null,
    timeline: (
      <CodexRailSection
        key="timeline"
        title="Timeline context"
        icon={<AlertTriangle className="size-3.5 text-amber-400" aria-hidden />}
        compact={railCompact}
        sectionId={CODEX_RAIL_CONTINUITY_ANCHOR_ID}
        pulse={pulseContinuitySection}
      >
        <WikiContinuityPanel
          campaignHandle={campaignHandle}
          currentPageId={pageId}
          pageTitle={pageTitle}
          compact={isEditingPage}
          sharedIssues={sharedIssues}
          sharedUnresolved={sharedUnresolved}
          sharedLoading={sharedDiagnosticsLoading}
          onSharedReload={onDiagnosticsReload}
        />
        {isDMUser ? (
          <Link
            to={`/campaigns/${campaignHandle}/world-maintenance`}
            className="text-xs text-primary hover:underline"
          >
            Campaign-wide maintenance
          </Link>
        ) : null}
      </CodexRailSection>
    ),
    discovery: isDMUser ? (
      <CodexRailSection
        key="discovery"
        title="Party knowledge"
        icon={<BookOpen className="size-3.5 text-primary" aria-hidden />}
        compact={railCompact}
      >
        <CodexDiscoverySection
          campaignHandle={campaignHandle}
          pageId={pageId}
          railCompact={railCompact}
          partyKnowledge={partyKnowledge}
          partyKnowledgeLoading={sharedDiagnosticsLoading}
          onPartyKnowledgeChanged={onDiagnosticsReload}
          highlightDiscovery={railVariant === 'discovery'}
          onOpenDiscoverySubview={openDiscoverySubview}
        />
      </CodexRailSection>
    ) : null,
    continuity: (
      <CodexRailSection
        key="continuity"
        title="Continuity"
        icon={<AlertTriangle className="size-3.5 text-amber-400" aria-hidden />}
        compact={railCompact}
        sectionId={CODEX_RAIL_CONTINUITY_ANCHOR_ID}
        pulse={pulseContinuitySection}
      >
        <WikiContinuityPanel
          campaignHandle={campaignHandle}
          currentPageId={pageId}
          pageTitle={pageTitle}
          compact={isEditingPage}
          sharedIssues={sharedIssues}
          sharedUnresolved={sharedUnresolved}
          sharedLoading={sharedDiagnosticsLoading}
          onSharedReload={onDiagnosticsReload}
        />
        {isDMUser ? (
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => onFocusBlock?.('wiki-backlinks')}
          >
            View on Continuity tab
          </button>
        ) : null}
      </CodexRailSection>
    ),
    threads: isDMUser ? (
      <CodexRailSection
        key="threads"
        title="Threads"
        icon={<GitBranch className="size-3.5 text-primary" aria-hidden />}
        compact={railCompact}
      >
        <p className="text-xs text-contextual-foreground/80">
          Narrative threads linked to this entry surface in Relations and on the
          Threads hub.
        </p>
        <Link
          to={`/campaigns/${campaignHandle}/wiki`}
          className="text-xs text-primary hover:underline"
        >
          Open Threads hub
        </Link>
      </CodexRailSection>
    ) : null,
  };

  return (
    <div
      className={
        scrollable
          ? `min-h-0 flex-1 overflow-y-auto px-3 py-3 ${
              railCompact ? 'space-y-3' : 'space-y-4'
            }`
          : `px-3 py-3 ${railCompact ? 'space-y-3' : 'space-y-4'}`
      }
    >
      <p className={SURFACE_RECESSED_CLASS}>{orchestrationLabel} workspace</p>

      {sectionOrder.map((key) => {
        const node = sections[key];
        if (!node) return null;
        if (key === 'callout') {
          const hasCallout =
            (railVariant === 'diagnostics' && continuitySummary?.hasAny) ||
            railVariant === 'discovery';
          return hasCallout ? node : null;
        }
        return node;
      })}
    </div>
  );
}

export function CodexRailSidebar({
  open,
  onClose,
  campaignHandle,
  pageId,
  pageTitle,
  templateType,
  pageMetadata,
  pageVisibility,
  isDMUser: isDMUserProp,
  isEditingPage,
  onVisibilityChange,
  parentChain,
  onFocusBlock,
  workspaceMode = 'balanced',
  onIdentityChanged,
  flatPages = [],
  memberRole,
  allowPlayerChronologyManagement = false,
  layout = 'overlay',
  surfaceMode = 'reading',
  railVariant = 'balanced',
  continuitySummary,
  sharedIssues,
  sharedUnresolved,
  sharedDiagnosticsLoading,
  onDiagnosticsReload,
  discovery,
  partyKnowledge,
  pulseContinuitySection = false,
  railSectionOrder,
  railSectionsHidden,
}: CodexRailSidebarProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const orchestration = getWorkspaceOrchestration(workspaceMode);
  const railCompact = orchestration.codexRailDensity === 'compact';
  const isOperationalOverlay =
    layout === 'overlay' && surfaceMode === 'operational';
  useBodyScrollLock(open && isOperationalOverlay);
  const showPartyLink = isCharacterWikiPage({
    templateType,
    metadata: pageMetadata,
  });
  const [panelWidth, setPanelWidth] = useState(loadInspectorWidth);
  const [backlinkCount, setBacklinkCount] = useState<number | null>(null);
  const [mentionCount, setMentionCount] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !pageId) return;
    let cancelled = false;
    void (async () => {
      try {
        const [backlinks, outlinks] = await Promise.all([
          fetchWikiBacklinks(campaignHandle, pageId),
          fetchWikiOutlinks(campaignHandle, pageId),
        ]);
        if (cancelled) return;
        setBacklinkCount(backlinks.length);
        setMentionCount(outlinks.total ?? 0);
      } catch {
        if (!cancelled) {
          setBacklinkCount(0);
          setMentionCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, campaignHandle, pageId]);

  useEffect(() => {
    if (!pulseContinuitySection || !open) return;
    requestAnimationFrame(() => {
      document
        .getElementById(CODEX_RAIL_CONTINUITY_ANCHOR_ID)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, [open, pulseContinuitySection]);

  useEffect(() => {
    const onWidthChange = () => setPanelWidth(loadInspectorWidth());
    window.addEventListener(INSPECTOR_WIDTH_EVENT, onWidthChange);
    return () => window.removeEventListener(INSPECTOR_WIDTH_EVENT, onWidthChange);
  }, []);

  const startResize = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const onMove = (moveEvent: MouseEvent) => {
      const next = clampInspectorWidth(window.innerWidth - moveEvent.clientX);
      setPanelWidth(next);
      saveInspectorWidth(next);
    };
    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  if (!open) return null;

  const headerSubtitle = resolveCodexRailHeaderSubtitle({
    railVariant,
    summary:
      continuitySummary ??
      ({
        totalIssueCount: 0,
        hasAny: false,
        hasCritical: false,
        hasWarnings: false,
        counts: { critical: 0, warning: 0, info: 0 },
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0,
        unresolvedCount: 0,
      } satisfies PageContinuitySummary),
    discovery,
    presenceState: partyKnowledge?.presenceState,
    isDMUser,
  });

  const bodyProps = {
    campaignHandle,
    pageId,
    pageTitle,
    templateType,
    pageMetadata,
    pageVisibility,
    isEditingPage,
    onVisibilityChange,
    parentChain,
    onFocusBlock,
    onIdentityChanged,
    flatPages,
    memberRole,
    allowPlayerChronologyManagement,
    railCompact,
    backlinkCount,
    mentionCount,
    showPartyLink,
    orchestrationLabel: orchestration.label,
    scrollable: isOperationalOverlay,
    railVariant,
    continuitySummary,
    sharedIssues,
    sharedUnresolved,
    sharedDiagnosticsLoading,
    onDiagnosticsReload,
    discovery,
    partyKnowledge,
    pulseContinuitySection,
    railSectionOrder,
    railSectionsHidden,
  };

  const showCloseButton = layout === 'overlay' || layout === 'stacked';

  const header = (
    <header className="flex shrink-0 items-center justify-between px-3 py-2">
      <div>
        <h2 className="text-sm font-semibold text-contextual-foreground/85">Context</h2>
        <p className={`${TYPE_META_CLASS} normal-case tracking-normal opacity-75`}>
          {headerSubtitle}
        </p>
      </div>
      {showCloseButton ? (
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-muted/80 hover:bg-[rgb(var(--color-focal-rgb)/0.06)] hover:text-foreground/90"
          aria-label="Close context rail"
        >
          <X className="size-5" />
        </button>
      ) : null}
    </header>
  );

  if (layout === 'inline') {
    return (
      <aside
        className={`${SURFACE_CONTEXTUAL_INLINE_CLASS} flex flex-col self-start lg:sticky lg:top-[var(--workspace-sticky-top,5rem)]`}
        aria-label="Codex context"
      >
        {header}
        <CodexRailBody {...bodyProps} scrollable={false} />
      </aside>
    );
  }

  if (layout === 'stacked') {
    return (
      <aside
        className={`${SURFACE_CONTEXTUAL_INLINE_CLASS} mt-6 flex w-full min-w-0 flex-col`}
        aria-label="Codex context"
      >
        {header}
        <CodexRailBody {...bodyProps} scrollable={false} />
      </aside>
    );
  }

  const widthStyle = {
    width: `min(${panelWidth}px, 92vw)`,
    maxWidth: `${INSPECTOR_WIDTH_MAX}px`,
    minWidth: `${INSPECTOR_WIDTH_MIN}px`,
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close Codex rail backdrop"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      <aside
        className={`${SURFACE_CONTEXTUAL_CLASS} fixed inset-y-0 right-0 z-50 flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-none shadow-xl`}
        style={widthStyle}
        aria-label="Codex context"
      >
        <button
          type="button"
          aria-label="Resize Codex rail"
          className="absolute left-0 top-0 z-[60] hidden h-full w-1.5 -translate-x-1/2 cursor-col-resize md:flex"
          onMouseDown={startResize}
        >
          <GripVertical className="size-3 text-muted" />
        </button>
        {header}
        <CodexRailBody {...bodyProps} />
      </aside>
    </>
  );
}
