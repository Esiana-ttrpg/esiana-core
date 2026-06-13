import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchCampaign } from '@/lib/campaigns';
import { fetchDashboardBundle, updateDashboardLayout } from '@/lib/dashboard';
import {
  normalizeDashboardConfig,
  type DashboardBundle,
  type DashboardConfig,
} from '@/lib/dashboardConfig';
import { resolveHeroCoverFromWizardAsset } from '@/lib/syncDashboardHeroCover';
import { CampaignMemberRoles } from '@/types/domain';
import type { CampaignDetail } from '@/types/campaign';
import { useWiki } from '@/contexts/WikiContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MascotErrorPanel } from '@/components/errors/MascotErrorPanel';
import { CampaignDashboardHero } from '@/components/dashboard/CampaignDashboardHero';
import { CampaignHomeBriefing } from '@/components/dashboard/CampaignHomeBriefing';
import { CampaignContinuityStream } from '@/components/dashboard/CampaignContinuityStream';
import { CampaignContextRail } from '@/components/dashboard/CampaignContextRail';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { LinkYourCharacterCard } from '@/components/dashboard/LinkYourCharacterCard';
import { NarrativeLayout } from '@/components/layout/NarrativeLayout';
import { PluginSlotHost, PluginUiSlots } from '@/plugins/slots';
import { useDeclaredPluginSlot } from '@/plugins/useDeclaredPluginSlot';

const LAYOUT_EDIT_ROLES = [
  CampaignMemberRoles.GAMEMASTER,
  CampaignMemberRoles.WRITER,
] as const;

const TIME_MANAGE_ROLES = LAYOUT_EDIT_ROLES;

const HERO_SAVE_DEBOUNCE_MS = 450;

export function CampaignDashboardPage() {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const { campaign: wikiCampaign } = useWiki();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [bundle, setBundle] = useState<DashboardBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!campaignHandle) return;
    setLoading(true);
    setError(null);
    try {
      const [campaignData, dashboardBundle] = await Promise.all([
        fetchCampaign(campaignHandle),
        fetchDashboardBundle(campaignHandle),
      ]);
      setCampaign(campaignData);
      setBundle(dashboardBundle);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign');
      setCampaign(null);
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (!campaignHandle) {
    return (
      <MascotErrorPanel
        code={404}
        title="Campaign not found"
        description="Missing campaign slug in the URL."
      />
    );
  }

  if (loading) {
    return <LoadingSpinner label="Loading campaign home…" />;
  }

  if (error || !campaign || !bundle) {
    return (
      <MascotErrorPanel
        code={404}
        title="Unable to load campaign"
        description={error ?? 'This campaign may be private or unavailable.'}
      />
    );
  }

  return (
    <CampaignDashboardContent
      campaignHandle={campaignHandle}
      campaign={campaign}
      bundle={bundle}
      displayName={wikiCampaign?.name ?? campaign.name}
      onBundleChange={setBundle}
    />
  );
}

interface CampaignDashboardContentProps {
  campaignHandle: string;
  campaign: CampaignDetail;
  bundle: DashboardBundle;
  displayName: string;
  onBundleChange: (bundle: DashboardBundle) => void;
}

function CampaignDashboardContent({
  campaignHandle,
  campaign,
  bundle,
  displayName,
  onBundleChange,
}: CampaignDashboardContentProps) {
  const saveHeroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wizardCoverSyncedRef = useRef(false);
  const hasDashboardSlot = useDeclaredPluginSlot(PluginUiSlots.DASHBOARD);
  const [customizeMode, setCustomizeMode] = useState(false);
  const [layoutSaving, setLayoutSaving] = useState(false);

  const canEditLayout =
    campaign.role !== null &&
    LAYOUT_EDIT_ROLES.includes(
      campaign.role as (typeof LAYOUT_EDIT_ROLES)[number],
    );

  const canManageTime =
    campaign.role !== null &&
    TIME_MANAGE_ROLES.includes(
      campaign.role as (typeof TIME_MANAGE_ROLES)[number],
    );
  const canManageCampaign = canManageTime;

  const dashboardConfig = normalizeDashboardConfig(bundle.dashboardConfig);

  const persistConfig = useCallback(
    async (nextConfig: DashboardConfig) => {
      const saved = await updateDashboardLayout(campaignHandle, nextConfig);
      onBundleChange({ ...bundle, dashboardConfig: saved });
      return saved;
    },
    [bundle, campaignHandle, onBundleChange],
  );

  const handleConfigChange = useCallback(
    (nextConfig: DashboardConfig) => {
      onBundleChange({ ...bundle, dashboardConfig: nextConfig });
    },
    [bundle, onBundleChange],
  );

  const handleHeroChange = useCallback(
    (hero: DashboardConfig['hero']) => {
      const nextConfig = { ...dashboardConfig, hero };
      handleConfigChange(nextConfig);
      if (!canEditLayout) return;
      if (saveHeroTimerRef.current) clearTimeout(saveHeroTimerRef.current);
      saveHeroTimerRef.current = setTimeout(() => {
        void persistConfig(nextConfig).catch((err) => {
          console.error('[dashboard] Failed to save hero presentation', err);
        });
      }, HERO_SAVE_DEBOUNCE_MS);
    },
    [canEditLayout, dashboardConfig, handleConfigChange, persistConfig],
  );

  useEffect(
    () => () => {
      if (saveHeroTimerRef.current) clearTimeout(saveHeroTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!canEditLayout || wizardCoverSyncedRef.current) return;
    if (dashboardConfig.hero.coverImageUrl?.trim()) {
      wizardCoverSyncedRef.current = true;
      return;
    }

    let cancelled = false;
    void (async () => {
      const nextHero = await resolveHeroCoverFromWizardAsset(
        campaignHandle,
        dashboardConfig,
      );
      if (cancelled || !nextHero) {
        wizardCoverSyncedRef.current = true;
        return;
      }
      wizardCoverSyncedRef.current = true;
      const nextConfig = { ...dashboardConfig, hero: nextHero };
      handleConfigChange(nextConfig);
      try {
        await persistConfig(nextConfig);
      } catch {
        /* hero still shown locally; user can retry via presentation editor */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    campaignHandle,
    canEditLayout,
    dashboardConfig,
    handleConfigChange,
    persistConfig,
  ]);

  const threadBundle =
    bundle.threadBundle ?? {
      living: bundle.openThreads ?? [],
      theories: [],
      recentlyResolved: [],
    };

  return (
    <div className="space-y-4">
      <LinkYourCharacterCard campaignHandle={campaignHandle} />
      {customizeMode ? (
        <>
          <CampaignDashboardHero
            campaignHandle={campaignHandle}
            campaign={campaign}
            campaignName={displayName}
            fallbackDescription={bundle.campaignDescription}
            hero={dashboardConfig.hero}
            statusStrip={bundle.summary.statusStrip}
            canManage={canManageCampaign}
            customizeMode={customizeMode}
            layoutSaving={layoutSaving}
            onCustomizeModeChange={setCustomizeMode}
            onHeroChange={handleHeroChange}
          />
          {hasDashboardSlot && campaign ? (
            <PluginSlotHost
              slot={PluginUiSlots.DASHBOARD}
              context={{
                campaignId: campaign.id,
                campaignHandle: campaign.handle,
                config: {},
              }}
            />
          ) : null}
          <DashboardGrid
            campaignHandle={campaignHandle}
            config={dashboardConfig}
            summary={bundle.summary}
            questPages={bundle.questPages}
            threadBundle={threadBundle}
            canEditLayout={canEditLayout}
            canManageCampaign={canManageCampaign}
            canManageTime={canManageTime}
            isLookingForGroup={Boolean(campaign.isLookingForGroup)}
            sessionDuration={campaign.sessionDuration}
            customizeMode={customizeMode}
            onConfigChange={handleConfigChange}
            onLayoutSavingChange={setLayoutSaving}
          />
        </>
      ) : (
        <NarrativeLayout
          composition="dashboard"
          inlineContextual
          focal={
            <div className="wiki-focal-region wiki-focal-region--canvas flex w-full min-w-0 flex-col overflow-hidden">
              <CampaignDashboardHero
                embedded
                campaignHandle={campaignHandle}
                campaign={campaign}
                campaignName={displayName}
                fallbackDescription={bundle.campaignDescription}
                hero={dashboardConfig.hero}
                statusStrip={bundle.summary.statusStrip}
                canManage={canManageCampaign}
                customizeMode={customizeMode}
                layoutSaving={layoutSaving}
                onCustomizeModeChange={setCustomizeMode}
                onHeroChange={handleHeroChange}
              />
              {hasDashboardSlot && campaign ? (
                <PluginSlotHost
                  slot={PluginUiSlots.DASHBOARD}
                  context={{
                    campaignId: campaign.id,
                    campaignHandle: campaign.handle,
                    config: {},
                  }}
                />
              ) : null}
              {bundle.narrativeSnapshot ? (
                <CampaignHomeBriefing snapshot={bundle.narrativeSnapshot} />
              ) : (
                <CampaignContinuityStream
                  embedded
                  campaignHandle={campaignHandle}
                  summary={bundle.summary}
                  questPages={bundle.questPages}
                />
              )}
              <details className="group pt-3 lg:hidden">
                <summary className="cursor-pointer list-none px-1 py-2 text-sm font-medium text-focal-muted marker:content-none [&::-webkit-details-marker]:hidden">
                  Explore
                </summary>
                <div className="mt-2">
                  <CampaignContextRail campaignHandle={campaignHandle} layout="elevated" />
                </div>
              </details>
            </div>
          }
          contextual={
            <div className="narrative-chrome-recede hidden lg:block">
              <CampaignContextRail campaignHandle={campaignHandle} layout="inline" />
            </div>
          }
        />
      )}
    </div>
  );
}
