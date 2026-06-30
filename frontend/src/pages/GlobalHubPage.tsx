import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BookOpen, Globe, Plus } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';

import { fetchMyCampaigns, fetchPublicCampaigns } from '@/lib/campaigns';

import { fetchUserHub, pinCampaign, unpinCampaign } from '@/lib/hub';

import type { CampaignSummary } from '@/types/campaign';
import {
  CampaignDiscoverability,
  normalizeDiscoverability,
} from '@shared/campaignPolicy/discoverability';

import type { UserHubResponse } from '@/types/hub';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

import { CreateCampaignWizardHost } from '@/components/hub/CreateCampaignWizardHost';

import { CampaignCard } from '@/components/hub/CampaignCard';

import { EmptyState } from '@/components/ui/EmptyState';

import { PageShell, SHOWCASE_MAX_WIDTH_CLASS } from '@/components/layout/PageShell';

import { FederatedAuthNotice } from '@/components/auth/FederatedAuthNotice';

import { HubResumeHero } from '@/components/hub/HubResumeHero';

import { HubAttentionQueue } from '@/components/hub/HubAttentionQueue';

import { CampaignLibrary } from '@/components/hub/CampaignLibrary';

import { HubRecentlyEdited } from '@/components/hub/HubRecentlyEdited';

import { HubAmbientShell } from '@/components/hub/HubAmbientShell';

import { HubActionButton } from '@/components/hub/HubActionButton';

import { HubSectionHeader } from '@/components/hub/HubSectionHeader';

import { HubShelfHorizon } from '@/components/hub/HubShelfHorizon';

import { rankCampaignsForContinue } from '@/lib/hubPrioritization';



export function GlobalHubPage() {
  const { t } = useTranslation();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);

  const [hubData, setHubData] = useState<UserHubResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);

  const [pinnedCampaignIds, setPinnedCampaignIds] = useState<string[]>([]);



  const loadCampaigns = useCallback(async () => {

    setLoading(true);

    setError(null);

    try {

      if (isAuthenticated) {

        const hub = await fetchUserHub();

        setHubData(hub);

        setCampaigns(hub.campaigns ?? []);

        setPinnedCampaignIds(hub.pinnedCampaignIds ?? []);

      } else {

        const data = await fetchPublicCampaigns();

        setHubData(null);

        setCampaigns(data ?? []);

        setPinnedCampaignIds([]);

      }

    } catch (err) {

      try {

        if (isAuthenticated) {

          const data = await fetchMyCampaigns();

          setHubData(null);

          setCampaigns(data ?? []);

        }

      } catch {

        setCampaigns([]);

      }

      setError(err instanceof Error ? err.message : t('home.loadFailed'));

    } finally {

      setLoading(false);

    }

  }, [isAuthenticated]);



  useEffect(() => {

    if (authLoading) return;

    void loadCampaigns();

  }, [authLoading, loadCampaigns]);



  const resumeHero = useMemo(() => {

    if (hubData?.resumeHero?.length) return hubData.resumeHero;

    if (hubData?.continue?.length) return hubData.continue;

    return rankCampaignsForContinue(campaigns, []).map((c) => ({

      campaign: c.campaign,

      score: c.score,

      reason: c.reason,

      ctaLabel: c.ctaLabel,

      ctaHref: c.ctaHref,

      unreadCount: c.unreadCount,

    }));

  }, [hubData, campaigns]);



  const publicOnly = useMemo(

    () =>
      (campaigns ?? []).filter(
        (c) =>
          !c.isMember &&
          normalizeDiscoverability(c.discoverability) === CampaignDiscoverability.PUBLIC,
      ),

    [campaigns],

  );



  const memberCount = useMemo(

    () => campaigns.filter((c) => c.isMember).length,

    [campaigns],

  );



  const handlePinToggle = useCallback(

    async (campaignId: string, currentlyPinned: boolean) => {

      try {

        if (currentlyPinned) {

          await unpinCampaign(campaignId);

          setPinnedCampaignIds((prev) => prev.filter((id) => id !== campaignId));

        } else {

          await pinCampaign(campaignId);

          setPinnedCampaignIds((prev) => [...prev, campaignId]);

        }

        void loadCampaigns();

      } catch {

        /* keep UI stable */

      }

    },

    [loadCampaigns],

  );



  if (authLoading || loading) {

    return <LoadingSpinner label="Loading campaigns…" />;

  }



  const showAttention = (hubData?.attentionQueue?.length ?? 0) > 0;

  const showRecent = (hubData?.recentEdits?.length ?? 0) > 0;



  return (

    <PageShell width="wide" className={`${SHOWCASE_MAX_WIDTH_CLASS} flex flex-col gap-6 py-6`}>

      <HubAmbientShell className="flex flex-col gap-6">

        <div className="hub-canopy flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <h1 className="hub-page-title text-3xl font-bold tracking-tight text-foreground">

              {isAuthenticated ? t('home.pageTitleAuthenticated') : t('home.pageTitleGuest')}

            </h1>

            <p className="mt-2 max-w-xl text-muted">

              {isAuthenticated
                ? t('home.pageSubtitleAuthenticated')
                : t('home.pageSubtitleGuest')}

            </p>

          </div>

          {isAuthenticated && (

            <HubActionButton variant="narrative" onClick={() => setCreateOpen(true)}>

              <Plus className="size-4" />

              {t('home.createCampaign')}

            </HubActionButton>

          )}

        </div>



        <FederatedAuthNotice />



        {error && (

          <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">

            {error}

          </p>

        )}



        {isAuthenticated && memberCount > 0 ? (

          <>

            <HubResumeHero

              heroes={resumeHero}

              upcomingChips={hubData?.upcomingChips ?? []}

              pinnedCampaignIds={pinnedCampaignIds}

              onPinToggle={handlePinToggle}

            />



            {showAttention ? (

              <HubAttentionQueue

                items={hubData!.attentionQueue}

                campaignCount={memberCount}

                onDismiss={() => void loadCampaigns()}

              />

            ) : null}



            <CampaignLibrary

              campaigns={campaigns}

              pinnedCampaignIds={pinnedCampaignIds}

              onPinToggle={handlePinToggle}

            />



            {showRecent ? (

              <HubRecentlyEdited items={hubData!.recentEdits} />

            ) : null}



            <HubShelfHorizon variant="member" />

          </>

        ) : isAuthenticated ? (

          <EmptyState

            icon={BookOpen}

            title={t('home.emptyTitle')}
            description={t('home.emptyDescription')}

          />

        ) : (

          <section className="space-y-4">

            <HubSectionHeader

              title="Public Campaigns"

              icon={Globe}

              variant="page"

            />

            {publicOnly.length === 0 ? (

              <EmptyState

                icon={BookOpen}

                title="No public campaigns yet"

                description="When DMs mark campaigns as publicly viewable, they will appear here."

              />

            ) : (

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                {publicOnly.map((campaign) => (

                  <CampaignCard key={campaign.id} campaign={campaign} badge="Public" />

                ))}

              </div>

            )}

            <HubShelfHorizon variant="guest" />

          </section>

        )}

      </HubAmbientShell>



      <CreateCampaignWizardHost
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          void loadCampaigns();
        }}
      />

    </PageShell>

  );

}


