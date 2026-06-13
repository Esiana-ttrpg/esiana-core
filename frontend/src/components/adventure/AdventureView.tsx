import { useCallback, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdventureWorkspace } from '@/contexts/AdventureWorkspaceContext';
import { fetchAdventureHub, type AdventureHubPayload } from '@/lib/adventure';
import {
  needsLegacyAdventureRedirect,
  readAdventureSectionFromSearch,
  adventureSectionHref,
} from '@/lib/adventureLayout';
import { campaignAdventureHubPath, campaignPath } from '@/lib/campaignPaths';
import { progressionSectionHref } from '@/lib/progressionLayout';
import { WikiWorkspaceShell } from '@/components/layout/WikiWorkspaceShell';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StorySection } from '@/components/adventure/StorySection';
import { TimelineSection } from '@/components/adventure/TimelineSection';
import { ContinuityDrawer } from '@/components/adventure/ContinuityDrawer';

interface AdventureViewProps {
  campaignHandle: string;
  categoryPageId: string;
}

export function AdventureView({ campaignHandle, categoryPageId }: AdventureViewProps) {
  const location = useLocation();
  const { isDMUser, playerPreview } = useAdventureWorkspace();

  const legacyRedirect = needsLegacyAdventureRedirect(location.search);
  const basePath = campaignAdventureHubPath(campaignHandle);

  if (legacyRedirect?.kind === 'progression') {
    return (
      <Navigate
        to={progressionSectionHref(
          campaignPath(campaignHandle, 'progression'),
          legacyRedirect.section as import('@shared/progressionHub').ProgressionSectionId,
          legacyRedirect.view ? { view: legacyRedirect.view } : undefined,
        )}
        replace
      />
    );
  }

  if (legacyRedirect?.kind === 'adventure') {
    const hasLegacySection =
      legacyRedirect.view != null ||
      legacyRedirect.threadsLens != null ||
      (new URLSearchParams(location.search).get('section') ?? '') !== legacyRedirect.section;
    if (hasLegacySection) {
      return (
        <Navigate
          to={adventureSectionHref(basePath, legacyRedirect.section, {
            view: legacyRedirect.view,
            threadsLens: legacyRedirect.threadsLens,
          })}
          replace
        />
      );
    }
  }

  const activeSection = readAdventureSectionFromSearch(location.search);
  const [sectionData, setSectionData] = useState<AdventureHubPayload | null>(null);
  const [loadingSection, setLoadingSection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [continuityOpen, setContinuityOpen] = useState(false);

  const loadSection = useCallback(async () => {
    if (activeSection === 'story') {
      if (!isDMUser || playerPreview) {
        setSectionData(null);
        return;
      }
      try {
        const continuityPayload = await fetchAdventureHub(campaignHandle, {
          pageId: categoryPageId,
          section: 'continuity',
        });
        setSectionData({ continuity: continuityPayload.continuity } as AdventureHubPayload);
      } catch {
        setSectionData(null);
      }
      return;
    }

    setLoadingSection(true);
    setError(null);
    try {
      const payload = await fetchAdventureHub(campaignHandle, {
        pageId: categoryPageId,
        section: 'timeline',
        previewAsPlayer: isDMUser && playerPreview,
      });
      setSectionData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline');
      setSectionData(null);
    } finally {
      setLoadingSection(false);
    }
  }, [activeSection, campaignHandle, categoryPageId, isDMUser, playerPreview]);

  useEffect(() => {
    void loadSection();
  }, [loadSection]);

  const pressureFeed = sectionData?.continuity?.pressureFeed ?? [];
  const issueCount = sectionData?.continuity?.issues?.length ?? 0;
  const pressureCount = pressureFeed.length || issueCount;
  const showContextualRail = isDMUser && !playerPreview;

  const contextualRail = showContextualRail ? (
    <div className="rounded border border-border p-3 text-sm">
      <p className="mb-2 font-medium">Narrative pressure</p>
      <ul className="space-y-1 text-xs text-muted-foreground">
        {pressureFeed.slice(0, 5).map((item) => (
          <li key={item.id}>{item.message}</li>
        ))}
        {pressureCount === 0 ? <li>No active pressure signals.</li> : null}
      </ul>
      <button
        type="button"
        onClick={() => setContinuityOpen(true)}
        className="mt-3 w-full rounded border border-border px-2 py-1 text-xs text-muted hover:border-primary/40 hover:text-foreground"
      >
        View continuity
        {pressureCount > 0 ? ` (${pressureCount})` : ''}
      </button>
    </div>
  ) : undefined;

  return (
    <>
      <WikiWorkspaceShell
        composition="studio"
        inlineContextual={showContextualRail}
        contextual={contextualRail}
      >
        <div className="adventure-shell-body min-h-[560px] w-full min-w-0">
          {error ? (
            <p className="mb-4 rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          {activeSection === 'story' ? (
            <StorySection
              campaignHandle={campaignHandle}
              categoryPageId={categoryPageId}
            />
          ) : loadingSection ? (
            <LoadingSpinner label="Loading timeline…" />
          ) : (
            <TimelineSection campaignHandle={campaignHandle} data={sectionData?.timeline} />
          )}

          {showContextualRail ? (
            <footer className="mt-4 border-t border-border pt-2 text-xs text-muted-foreground lg:hidden">
              {pressureCount > 0
                ? `${pressureCount} continuity / narrative pressure signal${pressureCount === 1 ? '' : 's'}`
                : 'No unresolved continuity issues detected'}
              <button
                type="button"
                className="ml-2 text-primary hover:underline"
                onClick={() => setContinuityOpen(true)}
              >
                View continuity
              </button>
            </footer>
          ) : null}
        </div>
      </WikiWorkspaceShell>

      <ContinuityDrawer
        open={continuityOpen}
        onClose={() => setContinuityOpen(false)}
        pressureFeed={pressureFeed}
        issueCount={issueCount}
      />
    </>
  );
}
