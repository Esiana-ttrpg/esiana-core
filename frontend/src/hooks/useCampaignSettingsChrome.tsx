import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  Brush,
  CalendarDays,
  Clock3,
  GitBranch,
  Plug,
  Settings,
  Shield,
  UserPlus,
  Users,
  Volume2,
  Wrench,
} from 'lucide-react';
import { CampaignCapabilities as C } from '@shared/campaignPolicy/capabilities';
import { apiFetch } from '@/lib/api';
import { useWiki } from '@/contexts/WikiContext';
import type { CampaignSettingsNavGroup } from '@/components/campaign/CampaignSettingsNav';
import {
  campaignSettingsSectionHref,
  isCampaignSettingsPathname,
  parseCampaignSettingsTab,
} from '@/lib/campaignSettingsNavigation';
import type { CampaignSettingsTab } from '@/lib/campaignPaths';
import { isElevatedMembershipRole } from '@/types/domain';

export interface CampaignSettingsChrome {
  groups: CampaignSettingsNavGroup[];
  activeTab: CampaignSettingsTab;
  requestedTab: CampaignSettingsTab;
  canManageSidebar: boolean;
  canReviewSafety: boolean;
  canAccessCampaignSettings: boolean;
  setSafetyUnread: (count: number) => void;
  sectionHref: (tab: CampaignSettingsTab) => string;
  navigationLabel: string;
  backLabel: string;
}

const CampaignSettingsChromeContext = createContext<CampaignSettingsChrome | null>(null);

function useCampaignSettingsChromeState(): CampaignSettingsChrome {
  const { t } = useTranslation();
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { campaign: wikiCampaign, can } = useWiki();
  const canReviewSafety = can(C.SAFETY_MANAGE);
  const canManageSidebar = can(C.PAGE_EDIT_ANY) || can(C.CAMPAIGN_SETTINGS_EDIT);
  const canAccessCampaignSettings =
    canReviewSafety ||
    can(C.CAMPAIGN_SETTINGS_EDIT) ||
    can(C.CAMPAIGN_MANAGE_ROLES) ||
    (wikiCampaign?.role != null && isElevatedMembershipRole(wikiCampaign.role));

  const [safetyUnreadState, setSafetyUnreadState] = useState({ campaignHandle, count: 0 });
  const safetyUnread =
    canReviewSafety && safetyUnreadState.campaignHandle === campaignHandle
      ? safetyUnreadState.count
      : 0;
  const setSafetyUnread = useCallback(
    (count: number) => {
      setSafetyUnreadState({ campaignHandle, count });
    },
    [campaignHandle],
  );

  const onSettings = isCampaignSettingsPathname(location.pathname, campaignHandle);

  useEffect(() => {
    let active = true;
    if (!onSettings || !canReviewSafety || !campaignHandle) return;
    setSafetyUnread(0);
    void apiFetch<{ unread: boolean }[]>(
      '/safety-privacy/requests?campaign=' + encodeURIComponent(campaignHandle),
    )
      .then((rows) => {
        if (active) setSafetyUnread(rows.filter((row) => row.unread).length);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [campaignHandle, canReviewSafety, onSettings, setSafetyUnread]);

  const requestedTab = parseCampaignSettingsTab(searchParams.get('tab'));
  const activeTab =
    !canManageSidebar && canReviewSafety
      ? 'safety-privacy'
      : requestedTab === 'safety-privacy' && !canReviewSafety
        ? 'general'
        : requestedTab;

  const groups = useMemo<CampaignSettingsNavGroup[]>(
    () => [
      {
        label: t('campaign.settings.groupCampaign'),
        items: canManageSidebar
          ? [
              { id: 'general', label: t('campaign.settings.tabGeneral'), icon: Settings },
              { id: 'appearance', label: t('campaign.settings.tabAppearance'), icon: Brush },
              { id: 'access', label: t('campaign.settings.tabAccess'), icon: Users },
              { id: 'recruitment', label: t('campaign.settings.tabRecruitment'), icon: UserPlus },
            ]
          : [],
      },
      {
        label: t('campaign.settings.groupSystems'),
        items: canManageSidebar
          ? [
              { id: 'scheduling', label: t('campaign.settings.tabScheduling'), icon: CalendarDays },
              { id: 'timeline', label: 'Timeline', icon: Clock3 },
              { id: 'world-development', label: t('campaign.settings.tabDevelopment'), icon: GitBranch },
              { id: 'audio', label: 'Audio', icon: Volume2 },
              { id: 'integrations', label: t('campaign.settings.tabIntegrations'), icon: Plug },
            ]
          : [],
      },
      {
        label: t('campaign.settings.groupAdministration'),
        items: [
          ...(canReviewSafety
            ? [
                {
                  id: 'safety-privacy' as const,
                  label:
                    t('profile.safety.title') + (safetyUnread ? ` (${safetyUnread})` : ''),
                  icon: Shield,
                },
              ]
            : []),
          ...(canManageSidebar
            ? [
                {
                  id: 'advanced' as const,
                  label: t('campaign.settings.tabAdvanced'),
                  icon: Wrench,
                },
              ]
            : []),
        ],
      },
    ],
    [canManageSidebar, canReviewSafety, safetyUnread, t],
  );

  const sectionHref = useCallback(
    (tab: CampaignSettingsTab) =>
      campaignSettingsSectionHref(campaignHandle, searchParams, activeTab, tab),
    [activeTab, campaignHandle, searchParams],
  );

  return {
    groups,
    activeTab,
    requestedTab,
    canManageSidebar,
    canReviewSafety,
    canAccessCampaignSettings,
    setSafetyUnread,
    sectionHref,
    navigationLabel: t('campaign.settings.pageTitle'),
    backLabel: t('campaign.settings.back'),
  };
}

export function CampaignSettingsChromeProvider({ children }: { children: ReactNode }) {
  const value = useCampaignSettingsChromeState();
  return (
    <CampaignSettingsChromeContext.Provider value={value}>
      {children}
    </CampaignSettingsChromeContext.Provider>
  );
}

export function useCampaignSettingsChrome(): CampaignSettingsChrome {
  const ctx = useContext(CampaignSettingsChromeContext);
  if (!ctx) {
    throw new Error('useCampaignSettingsChrome must be used within CampaignSettingsChromeProvider');
  }
  return ctx;
}
