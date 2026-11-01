import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchCampaign } from '@/lib/campaigns';
import { fetchDashboardBundle, updateDashboardLayout } from '@/lib/dashboard';
import {
  normalizeDashboardConfig,
  type DashboardBundle,
  type DashboardConfig,
} from '@/lib/dashboardConfig';
import { resolveHeroCoverFromWizardAsset } from '@/lib/syncDashboardHeroCover';
import { CampaignCapabilities as C } from '@shared/campaignPolicy/capabilities';
import type { CampaignDetail } from '@/types/campaign';
import { useWiki } from '@/contexts/WikiContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MascotErrorPanel } from '@/components/errors/MascotErrorPanel';
import { CampaignDashboardHero } from '@/components/dashboard/CampaignDashboardHero';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { LinkYourCharacterCard } from '@/components/dashboard/LinkYourCharacterCard';
import { PluginSlotHost, PluginUiSlots } from '@/plugins/slots';
import { useDeclaredPluginSlot } from '@/plugins/useDeclaredPluginSlot';
import { PluginPageExtensionsHost } from '@/components/plugins/PluginPageExtensionsHost';
import {
  campaignDashboardNavigationReducer,
  createCampaignDashboardNavigationState,
} from '@/lib/campaignDashboardNavigationState';

const HERO_SAVE_DEBOUNCE_MS = 450;

export function CampaignDashboardPage() {
  const { t } = useTranslation();
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const { campaign: wikiCampaign } = useWiki();
  const [navigationState, dispatch] = useReducer(
    campaignDashboardNavigationReducer,
    campaignHandle,
    createCampaignDashboardNavigationState,
  );
  const activeState =
    navigationState.campaignHandle === campaignHandle
      ? navigationState
      : createCampaignDashboardNavigationState(campaignHandle);
  const { campaign, bundle, loading, error } = activeState;

  const loadDashboard = useCallback(async () => {
    if (!campaignHandle) return;
    dispatch({ type: 'load', campaignHandle });
    try {
      const [campaignData, dashboardBundle] = await Promise.all([
        fetchCampaign(campaignHandle),
        fetchDashboardBundle(campaignHandle),
      ]);
      dispatch({
        type: 'success',
        campaignHandle,
        campaign: campaignData,
        bundle: dashboardBundle,
      });
    } catch (err) {
      dispatch({
        type: 'failure',
        campaignHandle,
        error: err instanceof Error ? err.message : t('campaign.dashboard.loadError'),
      });
    }
  }, [campaignHandle, t]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (!campaignHandle) {
    return (
      <MascotErrorPanel
        code={404}
        title={t('campaign.dashboard.campaignNotFound')}
        description={t('campaign.dashboard.campaignNotFoundDescription')}
      />
    );
  }

  if (loading) {
    return <LoadingSpinner label={t('campaign.dashboard.loadingCampaignHome')} />;
  }

  if (error || !campaign || !bundle) {
    return (
      <MascotErrorPanel
        code={404}
        title={t('campaign.dashboard.loadFailed')}
        description={error ?? t('campaign.dashboard.loadFailedDescription')}
      />
    );
  }

  return (
    <CampaignDashboardContent
      key={campaignHandle}
      campaignHandle={campaignHandle}
      campaign={campaign}
      bundle={bundle}
      displayName={wikiCampaign?.name ?? campaign.name}
      onBundleChange={(nextBundle) =>
        dispatch({ type: 'bundleChanged', campaignHandle, bundle: nextBundle })
      }
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
  const latestBundleRef = useRef(bundle);
  useEffect(() => { latestBundleRef.current = bundle; }, [bundle]);

  const { can } = useWiki();
  const allowed = (cap: Parameters<typeof can>[0]) => bundle.viewer ? bundle.viewer.capabilities.includes(cap) : can(cap);
  const canEditLayout = allowed(C.CAMPAIGN_SETTINGS_EDIT);
  const canManageTime = allowed(C.CHRONOLOGY_EDIT);
  const canManageCampaign = allowed(C.NOTES_MODERATE);

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

  // Reuse the bundle when returning from notes/media workflows. No widget timer
  // or separate transcription poll; keep in-progress layout edits intact.
  useEffect(() => {
    let cancelled = false;
    let pending = false;
    const refreshSessionSummary = () => {
      if (pending) return;
      pending = true;
      void fetchDashboardBundle(campaignHandle).then((refreshed) => {
        if (!cancelled) onBundleChange({ ...latestBundleRef.current, summary: refreshed.summary, narrativeSnapshot: refreshed.narrativeSnapshot, features: refreshed.features, viewer: refreshed.viewer });
      }).catch(() => { /* Retain the last successfully loaded summary. */ })
        .finally(() => { pending = false; });
    };
    window.addEventListener('focus', refreshSessionSummary);
    return () => { cancelled = true; window.removeEventListener('focus', refreshSessionSummary); };
  }, [campaignHandle, onBundleChange]);

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
      <CampaignDashboardHero
        embedded={!customizeMode}
        campaignHandle={campaignHandle}
        campaign={campaign}
        campaignName={displayName}
        fallbackDescription={bundle.campaignDescription}
        hero={dashboardConfig.hero}
        statusStrip={bundle.summary.statusStrip}
        canManage={canManageCampaign}
        canEditLayout={canEditLayout}
        customizeMode={customizeMode && canEditLayout}
        layoutSaving={layoutSaving}
        onCustomizeModeChange={(next) => { if (canEditLayout) setCustomizeMode(next); }}
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
        campaignDescription={bundle.campaignDescription}
        narrativeSnapshot={bundle.narrativeSnapshot}
        recentEntities={bundle.recentEntities}
        worldEvents={bundle.worldEvents}
        factionConflict={bundle.factionConflict}
        features={bundle.features}
        viewer={bundle.viewer}
        customizeMode={customizeMode && canEditLayout}
        onConfigChange={handleConfigChange}
        onLayoutSavingChange={setLayoutSaving}
        onWidgetFeedsChange={(feeds) => onBundleChange({ ...latestBundleRef.current, ...feeds })}
      />
      <PluginPageExtensionsHost target="campaign.dashboard" className="mt-2" />
    </div>
  );
}

