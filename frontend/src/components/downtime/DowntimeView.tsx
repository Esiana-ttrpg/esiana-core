import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import { fetchDowntimeHub, type DowntimeHubPayload } from '@/lib/downtime';
import {
  DOWNTIME_SECTIONS,
  readDowntimeSectionFromSearch,
  type DowntimeSectionId,
} from '@/lib/downtimeLayout';
import { WikiWorkspaceShell } from '@/components/layout/WikiWorkspaceShell';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DowntimeOverviewSection } from '@/components/downtime/DowntimeOverviewSection';
import { DowntimeWorldEventsSection } from '@/components/downtime/DowntimeWorldEventsSection';
import { DowntimeProjectsSection } from '@/components/downtime/DowntimeProjectsSection';
import { DowntimeHavensSection } from '@/components/downtime/DowntimeHavensSection';
import { DowntimeLedgerSection } from '@/components/downtime/DowntimeLedgerSection';
import { DowntimeReputationSection } from '@/components/downtime/DowntimeReputationSection';
import { CreateProjectModal } from '@/components/downtime/CreateProjectModal';
import { CreateHavenModal } from '@/components/downtime/CreateHavenModal';
import { CampaignMemberRoles } from '@/types/domain';

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

  const activeSection = readDowntimeSectionFromSearch(location.search);
  const [sectionData, setSectionData] = useState<DowntimeHubPayload | null>(null);
  const [loadingSection, setLoadingSection] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateHavenOpen, setIsCreateHavenOpen] = useState(false);

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

  async function handleProjectCreated() {
    await refresh();
    await loadSection();
  }

  async function handleHavenCreated() {
    await refresh();
    await loadSection();
  }

  return (
    <>
      <WikiWorkspaceShell composition="studio">
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
            <DowntimeProjectsSection
              cards={sectionData.projects.cards}
              canManage={canManage}
              onCreateClick={() => setIsCreateProjectOpen(true)}
            />
          ) : activeSection === 'havens' && sectionData?.havens ? (
            <DowntimeHavensSection
              cards={sectionData.havens.cards}
              framing={sectionData.havens.framing}
              canManage={canManage}
              onCreateClick={() => setIsCreateHavenOpen(true)}
            />
          ) : activeSection === 'ledger' && sectionData?.ledger ? (
            <DowntimeLedgerSection
              data={sectionData.ledger}
              campaignHandle={campaignHandle}
              flatPages={flatPages}
              canManage={canManage}
              canContribute={canContributeToLedger}
              onChanged={loadSection}
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
