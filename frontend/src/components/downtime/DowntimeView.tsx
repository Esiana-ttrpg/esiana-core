import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, ExternalLink, Settings2 } from 'lucide-react';
import { useWiki } from '@/contexts/WikiContext';
import { fetchDowntimeHub, type DowntimeHubPayload } from '@/lib/downtime';
import {
  DOWNTIME_SECTIONS,
  readDowntimeSectionFromSearch,
  resolveDowntimeSectionHeaderConfig,
  resolveDowntimeSectionItemCount,
  type DowntimeSectionId,
} from '@/lib/downtimeLayout';
import { WikiWorkspaceShell } from '@/components/layout/WikiWorkspaceShell';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { CategoryIndexToolbar } from '@/components/wiki/indexBrowse/CategoryIndexToolbar';
import { CategoryIndexActiveRefineChips } from '@/components/wiki/indexBrowse/CategoryIndexActiveRefineChips';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DowntimeOverviewSection } from '@/components/downtime/DowntimeOverviewSection';
import { DowntimeWorldEventsSection } from '@/components/downtime/DowntimeWorldEventsSection';
import { DowntimeProjectsSection } from '@/components/downtime/DowntimeProjectsSection';
import { DowntimeHavensSection } from '@/components/downtime/DowntimeHavensSection';
import {
  DowntimeLedgerSection,
  type DowntimeLedgerSectionHandle,
} from '@/components/downtime/DowntimeLedgerSection';
import { DowntimeReputationSection } from '@/components/downtime/DowntimeReputationSection';
import { LedgerRefinePopover } from '@/components/downtime/LedgerRefinePopover';
import { LedgerSortControl } from '@/components/downtime/LedgerSortControl';
import { CreateProjectModal } from '@/components/downtime/CreateProjectModal';
import { CreateHavenModal } from '@/components/downtime/CreateHavenModal';
import { CampaignMemberRoles } from '@/types/domain';
import { formatWorkspaceHubCountHint } from '@/lib/workspaceHeaderPolicy';
import {
  clearLedgerRefineChip,
  DEFAULT_LEDGER_BROWSE_STATE,
  hasActiveLedgerBrowse,
  listLedgerRefineChips,
  projectLedgerFeed,
  resetLedgerBrowse,
  type LedgerBrowseState,
  type LedgerSortMode,
} from '@/lib/ledgerBrowse';

interface DowntimeViewProps {
  campaignHandle: string;
  categoryPageId: string;
}

function sectionLabel(section: DowntimeSectionId): string {
  return DOWNTIME_SECTIONS.find((s) => s.id === section)?.label ?? section;
}

export function DowntimeView({ campaignHandle, categoryPageId }: DowntimeViewProps) {
  const { flatPages, refresh, campaign } = useWiki();
  const location = useLocation();
  const ledgerSectionRef = useRef<DowntimeLedgerSectionHandle>(null);

  const activeSection = readDowntimeSectionFromSearch(location.search);
  const [sectionData, setSectionData] = useState<DowntimeHubPayload | null>(null);
  const [loadingSection, setLoadingSection] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateHavenOpen, setIsCreateHavenOpen] = useState(false);
  const [ledgerBrowse, setLedgerBrowse] = useState<LedgerBrowseState>(
    DEFAULT_LEDGER_BROWSE_STATE,
  );
  const [ledgerSort, setLedgerSort] = useState<LedgerSortMode>('newest');

  const canManage =
    campaign?.role === CampaignMemberRoles.GAMEMASTER ||
    campaign?.role === CampaignMemberRoles.WRITER;

  const canContributeToLedger =
    canManage || campaign?.role === CampaignMemberRoles.PARTICIPANT;

  const loadSection = useCallback(async () => {
    setLoadingSection(true);
    setError(null);
    try {
      const payload = await fetchDowntimeHub(campaignHandle, {
        pageId: categoryPageId,
        section: activeSection,
      });
      setSectionData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Downtime section');
      setSectionData(null);
    } finally {
      setLoadingSection(false);
    }
  }, [activeSection, campaignHandle, categoryPageId]);

  useEffect(() => {
    void loadSection();
  }, [loadSection]);

  useEffect(() => {
    if (activeSection !== 'ledger') {
      setLedgerBrowse(DEFAULT_LEDGER_BROWSE_STATE);
      setLedgerSort('newest');
    }
  }, [activeSection]);

  async function handleProjectCreated() {
    await refresh();
    await loadSection();
  }

  async function handleHavenCreated() {
    await refresh();
    await loadSection();
  }

  const headerConfig = resolveDowntimeSectionHeaderConfig(activeSection);
  const sectionItemCount = resolveDowntimeSectionItemCount(activeSection, sectionData);

  const ledgerFeed = sectionData?.ledger?.feed ?? [];
  const filteredLedgerFeed = useMemo(
    () => projectLedgerFeed(ledgerFeed, ledgerBrowse, ledgerSort),
    [ledgerFeed, ledgerBrowse, ledgerSort],
  );

  const ledgerRefineChips = useMemo(
    () => listLedgerRefineChips(ledgerBrowse),
    [ledgerBrowse],
  );

  const resultCountLabel = useMemo(() => {
    if (!headerConfig || activeSection == null) return null;
    if (activeSection === 'ledger') {
      return formatWorkspaceHubCountHint({
        total: ledgerFeed.length,
        matching: filteredLedgerFeed.length,
        singular: headerConfig.countSingular,
        plural: headerConfig.countPlural,
        searchQuery: ledgerBrowse.search,
        hasActiveRefine: hasActiveLedgerBrowse(ledgerBrowse),
      });
    }
    return formatWorkspaceHubCountHint({
      total: sectionItemCount,
      matching: sectionItemCount,
      singular: headerConfig.countSingular,
      plural: headerConfig.countPlural,
    });
  }, [
    headerConfig,
    activeSection,
    sectionItemCount,
    ledgerFeed.length,
    filteredLedgerFeed.length,
    ledgerBrowse,
  ]);

  const sectionTrailing = useMemo(() => {
    if (activeSection === 'ledger' && sectionData?.ledger) {
      return (
        <div className="flex flex-wrap items-center gap-2">
          {canManage ? (
            <button
              type="button"
              onClick={() => ledgerSectionRef.current?.openSettings()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Settings2 className="size-3.5" />
              Settings
            </button>
          ) : null}
          {canContributeToLedger && sectionData.ledger.treasury.sharedTreasuryEnabled ? (
            <>
              <button
                type="button"
                onClick={() => ledgerSectionRef.current?.openQuickAction('contribute')}
                className="rounded-lg border border-border px-3 py-2 text-xs text-muted transition-colors hover:border-primary/40 hover:text-foreground"
              >
                Contribute
              </button>
              <button
                type="button"
                onClick={() => ledgerSectionRef.current?.openQuickAction('withdraw')}
                className="rounded-lg border border-border px-3 py-2 text-xs text-muted transition-colors hover:border-primary/40 hover:text-foreground"
              >
                Withdraw
              </button>
              <button
                type="button"
                onClick={() => ledgerSectionRef.current?.openQuickAction('fund_project')}
                className="rounded-lg border border-border px-3 py-2 text-xs text-muted transition-colors hover:border-primary/40 hover:text-foreground"
              >
                Fund project
              </button>
            </>
          ) : null}
        </div>
      );
    }
    if (activeSection === 'worldEvents' && sectionData?.worldEvents) {
      return (
        <Link
          to={sectionData.worldEvents.chronologyHref}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Calendar className="size-3.5 text-primary" />
          Open Chronology Hub
          <ExternalLink className="size-3" />
        </Link>
      );
    }
    return null;
  }, [
    activeSection,
    sectionData,
    canManage,
    canContributeToLedger,
  ]);

  const sectionToolbar =
    activeSection && headerConfig ? (
      <CategoryIndexToolbar
        createLabel={headerConfig.createLabel ?? 'Create'}
        onCreate={() => {
          if (activeSection === 'projects') setIsCreateProjectOpen(true);
          else if (activeSection === 'havens') setIsCreateHavenOpen(true);
          else if (activeSection === 'ledger') ledgerSectionRef.current?.openAdd();
        }}
        createAction={
          activeSection === 'projects' || activeSection === 'havens'
            ? canManage
              ? undefined
              : null
            : activeSection === 'ledger'
              ? canContributeToLedger
                ? undefined
                : null
              : null
        }
        resultCountLabel={resultCountLabel}
        refineControl={
          activeSection === 'ledger' ? (
            <LedgerRefinePopover
              browseState={ledgerBrowse}
              onBrowseChange={setLedgerBrowse}
            />
          ) : null
        }
        sortControl={
          activeSection === 'ledger' && ledgerFeed.length > 0 ? (
            <LedgerSortControl value={ledgerSort} onChange={setLedgerSort} />
          ) : null
        }
        trailing={sectionTrailing}
      />
    ) : null;

  const activeFilters =
    activeSection === 'ledger' && ledgerRefineChips.length > 0 ? (
      <CategoryIndexActiveRefineChips
        chips={ledgerRefineChips.map((chip) => ({
          facetId: chip.id,
          facetLabel: 'Filter',
          optionValue: chip.label,
        }))}
        onRemove={(facetId) =>
          setLedgerBrowse((prev) => clearLedgerRefineChip(prev, facetId))
        }
      />
    ) : null;

  return (
    <>
      <WikiWorkspaceShell
        composition="studio"
        header={
          headerConfig ? (
            <WorkspaceHeader
              title={headerConfig.displayTitle}
              actions={activeSection ? sectionToolbar : undefined}
              activeFilters={activeFilters}
            />
          ) : null
        }
      >
        <div className="downtime-shell-body min-h-[560px] w-full min-w-0">
          {error ? (
            <p className="mb-4 rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          {loadingSection ? (
            <LoadingSpinner
              label={
                activeSection ? `Loading ${sectionLabel(activeSection)}…` : 'Loading Downtime…'
              }
            />
          ) : activeSection == null && sectionData?.overview ? (
            <DowntimeOverviewSection
              campaignHandle={campaignHandle}
              categoryPageId={categoryPageId}
              snapshot={sectionData.overview.simulationSnapshot}
            />
          ) : activeSection === 'worldEvents' && sectionData?.worldEvents ? (
            <DowntimeWorldEventsSection
              data={sectionData.worldEvents}
              campaignHandle={campaignHandle}
              canManage={canManage}
              onChanged={loadSection}
            />
          ) : activeSection === 'projects' && sectionData?.projects ? (
            <DowntimeProjectsSection cards={sectionData.projects.cards} />
          ) : activeSection === 'havens' && sectionData?.havens ? (
            <DowntimeHavensSection
              cards={sectionData.havens.cards}
              framing={sectionData.havens.framing}
            />
          ) : activeSection === 'ledger' && sectionData?.ledger ? (
            <DowntimeLedgerSection
              ref={ledgerSectionRef}
              data={sectionData.ledger}
              campaignHandle={campaignHandle}
              flatPages={flatPages}
              canManage={canManage}
              canContribute={canContributeToLedger}
              onChanged={loadSection}
              feedLines={filteredLedgerFeed}
              browseActive={hasActiveLedgerBrowse(ledgerBrowse)}
              onClearBrowse={() => setLedgerBrowse(resetLedgerBrowse())}
            />
          ) : activeSection === 'reputation' && sectionData?.reputation ? (
            <DowntimeReputationSection
              data={sectionData.reputation}
              campaignHandle={campaignHandle}
              canManage={canManage}
              onChanged={loadSection}
            />
          ) : activeSection != null ? (
            <p className="text-sm text-muted-foreground">Unable to load this section.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load Downtime overview.</p>
          )}
        </div>
      </WikiWorkspaceShell>

      <CreateProjectModal
        open={isCreateProjectOpen}
        campaignHandle={campaignHandle}
        flatPages={flatPages}
        onClose={() => setIsCreateProjectOpen(false)}
        onCreated={() => void handleProjectCreated()}
      />
      <CreateHavenModal
        open={isCreateHavenOpen}
        campaignHandle={campaignHandle}
        onClose={() => setIsCreateHavenOpen(false)}
        onCreated={() => void handleHavenCreated()}
      />
    </>
  );
}
