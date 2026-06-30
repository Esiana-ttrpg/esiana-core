import { useCallback, useEffect, useRef, useState } from 'react';
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
import { CampaignMemberRoles } from '@/types/domain';
import type { CampaignDetail } from '@/types/campaign';
import { useWiki } from '@/contexts/WikiContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MascotErrorPanel } from '@/components/errors/MascotErrorPanel';
import { CampaignDashboardHero } from '@/components/dashboard/CampaignDashboardHero';
import { CampaignContinuityStream } from '@/components/dashboard/CampaignContinuityStream';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { LinkYourCharacterCard } from '@/components/dashboard/LinkYourCharacterCard';
import { PluginSlotHost, PluginUiSlots } from '@/plugins/slots';
import { useDeclaredPluginSlot } from '@/plugins/useDeclaredPluginSlot';

const LAYOUT_EDIT_ROLES = [
  CampaignMemberRoles.GAMEMASTER,
  CampaignMemberRoles.WRITER,
] as const;

const TIME_MANAGE_ROLES = LAYOUT_EDIT_ROLES;

const HERO_SAVE_DEBOUNCE_MS = 450;

export function CampaignDashboardPage() {
  const { t } = useTranslation();
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
      setError(err instanceof Error ? err.message : t('campaign.dashboard.loadError'));
      setCampaign(null);
      setBundle(null);
    } finally {
      setLoading(false);
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
  const hasEnabledWidgets = dashboardConfig.widgets.some((widget) => widget.enabled);

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
      <CampaignDashboardHero
        embedded={!customizeMode}
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
        narrativeSnapshot={bundle.narrativeSnapshot}
        recentEntities={bundle.recentEntities}
        worldEvents={bundle.worldEvents}
        factionConflict={bundle.factionConflict}
        customizeMode={customizeMode}
        onConfigChange={handleConfigChange}
        onLayoutSavingChange={setLayoutSaving}
      />
      {!hasEnabledWidgets && !bundle.narrativeSnapshot ? (
        <CampaignContinuityStream
          embedded
          campaignHandle={campaignHandle}
          summary={bundle.summary}
          questPages={bundle.questPages}
        />
      ) : null}
    </div>
  );
}
