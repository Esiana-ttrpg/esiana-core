import { SafetyPrivacySection } from '@/components/settings/SafetyPrivacySection';
import { CampaignCapabilities as C } from '@shared/campaignPolicy/capabilities';
import { apiFetch } from '@/lib/api';
import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Brush, CalendarDays, Clock3, Copy, GitBranch, Plug, RefreshCw, Settings, Shield, Users, Volume2, Wrench, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom';
import { CampaignSettingsNav, type CampaignSettingsNavGroup } from '@/components/campaign/CampaignSettingsNav';
import { campaignSettingsSectionHref } from '@/lib/campaignSettingsNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { useWiki } from '@/contexts/WikiContext';
import { StatusTab } from '@/components/StatusTab';
import { CampaignBackupTab } from '@/components/campaign/CampaignBackupTab';
import { CampaignPluginsSettingsTab } from '@/components/campaign/CampaignPluginsSettingsTab';
import { CampaignWebhooksSettings } from '@/components/campaign/CampaignWebhooksSettings';
import { CampaignDiscordSettings } from '@/components/campaign/CampaignDiscordSettings';
import { RecruitmentSettingsTab } from '@/components/campaign/RecruitmentSettingsTab';
import { SchedulingSettingsTab } from '@/components/campaign/SchedulingSettingsTab';
import { TimelineSettingsTab } from '@/components/campaign/TimelineSettingsTab';
import { WorldDevelopmentSettingsTab } from '@/components/campaign/WorldDevelopmentSettingsTab';
import { PageShell } from '@/components/layout/PageShell';
import { SidebarSettingsTab } from '@/components/campaign/SidebarSettingsTab';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { CampaignAppearanceSettingsTab } from '@/components/campaign/CampaignAppearanceSettingsTab';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import { MemberIdentityLabel } from '@/components/campaign/MemberIdentityLabel';
import {
  isAppearanceProfileDefined,
  isThemePresetId,
  legacyBrandingToThemeProfile,
  normalizeThemeProfile,
  type ThemePresetId,
  type ThemeProfile,
} from '@/lib/theme';
import { controlClasses } from '@/components/ui/formStyles';
import { ApiError } from '@/lib/api';
import {
  fetchCampaign,
  fetchCampaignMembers,
  removeCampaignMember,
  rotateCampaignInvite,
  updateCampaignMemberRole,
  updateCampaignSettings,
} from '@/lib/campaigns';
import { updateMemberIdentityPage } from '@/lib/campaignMemberIdentity';
import { initiateOwnershipTransfer } from '@/lib/notifications';
import { GameSystemSelect } from '@/components/campaign/GameSystemSelect';
import { DEFAULT_GAME_SYSTEM_SLUG } from '@shared/gameSystems';
import {
  CampaignDiscoverability,
  normalizeDiscoverability,
  type CampaignDiscoverabilityValue,
} from '@shared/campaignPolicy/discoverability';
import { DeleteCampaignModal } from '@/components/campaign/DeleteCampaignModal';
import { ArchiveCampaignModal } from '@/components/campaign/ArchiveCampaignModal';
import { useCampaignInviteLink } from '@/hooks/useCampaignInviteLink';
import { CampaignInviteEmailForm } from '@/components/campaign/CampaignInviteEmailForm';
import { CollaborationPermissionsPanel } from '@/components/settings/CollaborationPermissionsPanel';
import { CampaignAudioSettingsTab } from '@/components/campaign/CampaignAudioSettingsTab';
import {
  campaignDashboardPath,
  campaignSettingsPath,
  type CampaignSettingsTab,
} from '@/lib/campaignPaths';
import { isElevatedMembershipRole } from '@/types/domain';
import { isCharacterWikiPage } from '@/lib/isCharacterWikiPage';

const SETTINGS_TABS = [
  'safety-privacy',
  'general',
  'access',
  'recruitment',
  'scheduling',
  'audio',
  'timeline',
  'world-development',
  'appearance',
  'integrations',
  'advanced',
] as const satisfies readonly CampaignSettingsTab[];

function parseSettingsTab(value: string | null): CampaignSettingsTab {
  if (value && SETTINGS_TABS.includes(value as CampaignSettingsTab)) {
    return value as CampaignSettingsTab;
  }
  return 'general';
}

type AccessRole = 'GAMEMASTER' | 'WRITER' | 'PARTICIPANT' | 'OBSERVER';

interface CampaignAccessMember {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: AccessRole;
  isCampaignOwner: boolean;
  identityPageId?: string | null;
  identityPageTitle?: string | null;
  playerContext?: string;
  label?: string;
}

export function CampaignSettingsPage() {
  const { t } = useTranslation();
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { campaign: wikiCampaign, flatPages, refresh: refreshWiki } = useWiki();
  const { can } = useWiki();
  const canReviewSafety = can(C.SAFETY_MANAGE);
  const [safetyUnreadState, setSafetyUnreadState] = useState({ campaignHandle, count: 0 });
  const safetyUnread = canReviewSafety && safetyUnreadState.campaignHandle === campaignHandle
    ? safetyUnreadState.count : 0;
  const setSafetyUnread = useCallback((count: number) => {
    setSafetyUnreadState({ campaignHandle, count });
  }, [campaignHandle]);
  useEffect(() => {
    let active = true;
    setSafetyUnread(0);
    if (!canReviewSafety) return;
    void apiFetch<{ unread: boolean }[]>('/safety-privacy/requests?campaign=' + encodeURIComponent(campaignHandle))
      .then(rows => { if (active) setSafetyUnread(rows.filter(r => r.unread).length); }).catch(() => {});
    return () => { active = false; };
  }, [campaignHandle, canReviewSafety, setSafetyUnread]);
  const canManageSidebar = can(C.PAGE_EDIT_ANY) || can(C.CAMPAIGN_SETTINGS_EDIT);
  const canManageAccess = can(C.CAMPAIGN_MANAGE_ROLES);
  const canManageMemberIdentity = can(C.PAGE_EDIT_ANY);
  const canAccessCampaignSettings =
    canReviewSafety ||
    can(C.CAMPAIGN_SETTINGS_EDIT) ||
    can(C.CAMPAIGN_MANAGE_ROLES) ||
    (wikiCampaign?.role != null && isElevatedMembershipRole(wikiCampaign.role));

  const characterPages = useMemo(
    () => flatPages.filter((page) => isCharacterWikiPage(page, flatPages)),
    [flatPages],
  );

  const requestedTab = parseSettingsTab(searchParams.get('tab'));
  const activeTab = !canManageSidebar && canReviewSafety
    ? 'safety-privacy'
    : requestedTab === 'safety-privacy' && !canReviewSafety
      ? 'general'
      : requestedTab;

  const inviteLink = useCampaignInviteLink(campaignHandle, {
    enabled: activeTab === 'access' && Boolean(campaignHandle),
  });
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discoverability, setDiscoverability] = useState<CampaignDiscoverabilityValue>(
    CampaignDiscoverability.PRIVATE,
  );
  const [language, setLanguage] = useState<string | null>(null);
  const [gameSystem, setGameSystem] = useState<string | null>(null);
  const [customGameSystemName, setCustomGameSystemName] = useState<string | null>(null);
  const [themePreset, setThemePreset] = useState<ThemePresetId>('dark');
  const [campaignAppearance, setCampaignAppearance] = useState<ThemeProfile | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [members, setMembers] = useState<CampaignAccessMember[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [rotatingInvite, setRotatingInvite] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [updatingIdentityUserId, setUpdatingIdentityUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadCampaign = async () => {
      if (!campaignHandle) return;

      try {
        const campaign = await fetchCampaign(campaignHandle);
        setName(campaign.name || '');
        setDescription(campaign.description ?? '');
        setDiscoverability(normalizeDiscoverability(campaign.discoverability));
        setLanguage(campaign.language ?? 'English');
        setGameSystem(campaign.gameSystem ?? DEFAULT_GAME_SYSTEM_SLUG);
        setCustomGameSystemName(campaign.customGameSystemName ?? null);
        const loadedPreset = campaign.themePreset ?? 'dark';
        setThemePreset(
          isThemePresetId(loadedPreset) ? loadedPreset : 'dark',
        );
        if (isAppearanceProfileDefined(campaign.appearanceProfile)) {
          setCampaignAppearance(
            normalizeThemeProfile(campaign.appearanceProfile),
          );
        } else if (loadedPreset) {
          setCampaignAppearance(
            legacyBrandingToThemeProfile({ globalThemePreset: loadedPreset }),
          );
        } else {
          setCampaignAppearance(null);
        }
      } catch (err) {
        console.error('Error fetching campaign:', err);
        setSettingsError(t('campaign.settings.loadFailed'));
      }
    };

    void loadCampaign();
  }, [campaignHandle, t]);

  useEffect(() => {
    if (activeTab !== 'access' || !campaignHandle) return;

    const loadMembers = async () => {
      setAccessLoading(true);
      setAccessError('');
      try {
        const loaded = await fetchCampaignMembers(campaignHandle);
        setMembers(loaded as CampaignAccessMember[]);
      } catch (error) {
        console.error('Error loading campaign access data:', error);
        const message = error instanceof Error ? error.message : '';
        const isNetworkFailure =
          error instanceof TypeError ||
          /failed to fetch/i.test(message) ||
          /networkerror/i.test(message);

        setAccessError(
          isNetworkFailure
            ? 'Could not reach the backend API. If you are running locally, start it with "npm run dev:backend" and refresh.'
            : error instanceof ApiError
              ? error.message
              : 'Failed to load access control data.',
        );
      } finally {
        setAccessLoading(false);
      }
    };

    void loadMembers();
  }, [activeTab, campaignHandle]);

  const handleCopyInviteUrl = async () => {
    const ok = await inviteLink.copyInviteUrl();
    if (!ok && inviteLink.error) {
      setAccessError(inviteLink.error);
    }
  };

  const handleRotateInvite = async () => {
    if (!campaignHandle) return;
    setRotatingInvite(true);
    setAccessError('');
    try {
      await rotateCampaignInvite(campaignHandle);
      inviteLink.reload();
    } catch (error) {
      console.error('Error rotating invite URL:', error);
      setAccessError('Unable to regenerate invite link.');
    } finally {
      setRotatingInvite(false);
    }
  };

  const handleMemberRoleChange = async (userId: string, role: AccessRole) => {
    if (!campaignHandle) return;
    setUpdatingMemberId(userId);
    setAccessError('');
    try {
      await updateCampaignMemberRole(campaignHandle, userId, role);
      setMembers((prev) =>
        prev.map((member) => (member.userId === userId ? { ...member, role } : member)),
      );
    } catch (error) {
      console.error('Error updating member role:', error);
      setAccessError(error instanceof Error ? error.message : 'Unable to update member role.');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleMemberIdentityChange = async (
    userId: string,
    identityPageId: string | null,
  ) => {
    if (!campaignHandle) return;
    const isSelf = user?.id === userId;
    if (!isSelf && !canManageMemberIdentity) {
      throw new Error('You cannot update this member identity mapping.');
    }

    setUpdatingIdentityUserId(userId);
    setAccessError('');
    try {
      const updated = await updateMemberIdentityPage(
        campaignHandle,
        userId,
        identityPageId,
      );
      setMembers((prev) =>
        prev.map((member) =>
          member.userId === userId
            ? { ...member, ...updated, role: member.role }
            : member,
        ),
      );
    } catch (error) {
      console.error('Error updating member identity:', error);
      setAccessError(
        error instanceof Error ? error.message : 'Unable to update identity mapping.',
      );
      throw error;
    } finally {
      setUpdatingIdentityUserId(null);
    }
  };

  const handleRemoveMember = async (member: CampaignAccessMember) => {
    if (!campaignHandle) return;
    const confirmed = window.confirm(`Remove ${member.name} from this campaign?`);
    if (!confirmed) return;
    setUpdatingMemberId(member.userId);
    setAccessError('');
    try {
      await removeCampaignMember(campaignHandle, member.userId);
      setMembers((prev) => prev.filter((entry) => entry.userId !== member.userId));
    } catch (error) {
      console.error('Error removing member:', error);
      setAccessError(error instanceof Error ? error.message : 'Unable to remove member.');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleOfferOwnership = async (member: CampaignAccessMember) => {
    if (!campaignHandle) return;
    const confirmed = window.confirm(
      `Offer primary DM ownership to ${member.name}? They must accept before roles change.`,
    );
    if (!confirmed) return;
    setUpdatingMemberId(member.userId);
    setAccessError('');
    try {
      await initiateOwnershipTransfer(campaignHandle, member.userId);
      setAccessError('');
      window.alert('Ownership transfer offered. The Writer will receive a notification.');
    } catch (error) {
      setAccessError(
        error instanceof Error ? error.message : 'Unable to offer ownership transfer.',
      );
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess(false);
    setSettingsLoading(true);

    if (!name.trim()) {
      setSettingsError(t('campaign.settings.nameRequired'));
      setSettingsLoading(false);
      return;
    }

    if (gameSystem === 'other' && !customGameSystemName?.trim()) {
      setSettingsError('Enter a custom game system name when selecting Other.');
      setSettingsLoading(false);
      return;
    }

    try {
      const campaign = await updateCampaignSettings(campaignHandle, {
        name: name.trim(),
        description: description.trim() || null,
        discoverability,
        language: language?.trim() || null,
        gameSystem: gameSystem?.trim() || null,
        customGameSystemName:
          gameSystem === 'other' ? customGameSystemName?.trim() || null : null,
      });

      setName(campaign.name);
      setDescription(campaign.description ?? '');
      setDiscoverability(normalizeDiscoverability(campaign.discoverability));
      setLanguage(campaign.language ?? 'English');
      setGameSystem(campaign.gameSystem ?? DEFAULT_GAME_SYSTEM_SLUG);
      setCustomGameSystemName(campaign.customGameSystemName ?? null);
      void refreshWiki();
      const nextHandle = campaign.handle as string | undefined;
      if (nextHandle && nextHandle !== campaignHandle) {
        navigate(campaignSettingsPath(nextHandle, activeTab), { replace: true });
      }
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving campaign settings:', err);
      setSettingsError(
        err instanceof ApiError ? err.message : t('campaign.settings.saveFailed'),
      );
    } finally {
      setSettingsLoading(false);
    }
  };

  const settingsGroups = useMemo<CampaignSettingsNavGroup[]>(
    () => [
      {
        label: t('campaign.settings.groupCampaign'),
        items: canManageSidebar ? [
          { id: 'general', label: t('campaign.settings.tabGeneral'), icon: Settings },
          { id: 'appearance', label: t('campaign.settings.tabAppearance'), icon: Brush },
          { id: 'access', label: t('campaign.settings.tabAccess'), icon: Users },
          { id: 'recruitment', label: t('campaign.settings.tabRecruitment'), icon: UserPlus },
        ] : [],
      },
      {
        label: t('campaign.settings.groupSystems'),
        items: canManageSidebar ? [
          { id: 'scheduling', label: t('campaign.settings.tabScheduling'), icon: CalendarDays },
          { id: 'timeline', label: 'Timeline', icon: Clock3 },
          { id: 'world-development', label: t('campaign.settings.tabDevelopment'), icon: GitBranch },
          { id: 'audio', label: 'Audio', icon: Volume2 },
          { id: 'integrations', label: t('campaign.settings.tabIntegrations'), icon: Plug },
        ] : [],
      },
      {
        label: t('campaign.settings.groupAdministration'),
        items: [
          ...(canReviewSafety ? [{ id: 'safety-privacy' as const, label: t('profile.safety.title') + (safetyUnread ? ` (${safetyUnread})` : ''), icon: Shield }] : []),
          ...(canManageSidebar ? [{ id: 'advanced' as const, label: t('campaign.settings.tabAdvanced'), icon: Wrench }] : []),
        ],
      },
    ],
    [canManageSidebar, canReviewSafety, safetyUnread, t],
  );

  if (wikiCampaign && canAccessCampaignSettings && requestedTab !== activeTab) {
    return <Navigate to={campaignSettingsSectionHref(campaignHandle, searchParams, requestedTab, activeTab)} replace />;
  }

  if (wikiCampaign && !canAccessCampaignSettings) {
    return <Navigate to={campaignDashboardPath(campaignHandle)} replace />;
  }

  return (
    <PageShell width="wide" className="flex min-w-0 flex-col gap-4 md:flex-row md:gap-6">
      <CampaignSettingsNav
        key={campaignHandle}
        campaignHandle={campaignHandle}
        campaignName={wikiCampaign?.name || campaignHandle}
        groups={settingsGroups}
        activeTab={activeTab}
        sectionHref={tab => campaignSettingsSectionHref(campaignHandle, searchParams, activeTab, tab)}
        navigationLabel={t('campaign.settings.pageTitle')}
        settingsLabel={t('campaign.settings.contextLabel')}
      />
      <div className="min-w-0 flex-1 space-y-4 md:space-y-6">
      <h1 className="sr-only">{t('campaign.settings.pageTitle')}</h1>
      {activeTab === 'safety-privacy' ? (
        canReviewSafety ? <SafetyPrivacySection key={campaignHandle} campaignHandle={campaignHandle} onUnreadChange={setSafetyUnread} /> : null
      ) : activeTab === 'general' ? (
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            {t('campaign.settings.generalHeading')}
          </h2>

          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-foreground">
                  {t('campaign.settings.campaignNameLabel')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={controlClasses}
                />
              </div>

              <div className="sm:col-span-2">
                <p className="mb-2 text-sm text-foreground">Discoverability</p>
                <div className="space-y-2">
                  {(
                    [
                      {
                        value: CampaignDiscoverability.PRIVATE,
                        label: 'Private',
                        description:
                          'Only invited members can access this campaign.',
                      },
                      {
                        value: CampaignDiscoverability.PUBLIC,
                        label: 'Public',
                        description:
                          'Listed on the Global Hub and recruitment marketplace. Public discovery applies to campaign visibility, not party membership.',
                      },
                    ] as const
                  ).map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-3 transition ${
                        discoverability === option.value
                          ? 'border-primary/60 bg-primary/10'
                          : 'border-border bg-elevated hover:border-primary/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="discoverability"
                        value={option.value}
                        checked={discoverability === option.value}
                        onChange={() => setDiscoverability(option.value)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-medium text-foreground">
                          {option.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-foreground">Campaign Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full rounded border border-border bg-elevated px-3 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-foreground">Language</label>
                <input
                  type="text"
                  value={language ?? ''}
                  onChange={(e) => setLanguage(e.target.value || null)}
                  className={controlClasses}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-foreground">Game System</label>
                <GameSystemSelect
                  gameSystem={gameSystem}
                  customGameSystemName={customGameSystemName}
                  onGameSystemChange={setGameSystem}
                  onCustomNameChange={setCustomGameSystemName}
                  selectClassName={controlClasses}
                  inputClassName={controlClasses}
                />
              </div>
            </div>

            {settingsError && (
              <div className="rounded border border-red-700 bg-red-950/50 p-3 text-red-200">
                {settingsError}
              </div>
            )}
            {settingsSuccess && (
              <div className="rounded border border-emerald-700 bg-emerald-950/50 p-3 text-emerald-200">
                {t('campaign.settings.saveSuccess')}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={settingsLoading}
                className="h-10 rounded border border-border bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover disabled:bg-elevated"
              >
                {settingsLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>

            <div className="mt-8 rounded-lg border border-red-600 bg-red-950/10 p-5">
              <h3 className="mb-4 text-base font-semibold text-white">Danger Zone</h3>
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded border border-red-700 bg-red-950/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-red-200">Archive Campaign</p>
                    <p className="text-sm text-muted">
                      Hide from the hub and recruitment. Manage archived campaigns on Your Campaigns.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowArchiveModal(true)}
                    className="h-10 rounded border border-border bg-elevated px-4 text-sm font-medium text-foreground hover:bg-elevated"
                  >
                    Archive…
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="h-10 rounded border border-red-700 bg-red-600 px-5 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Delete Campaign
                  </button>
                  <p className="text-sm text-muted">
                    This action is permanent and requires confirmation.
                  </p>
                </div>
              </div>
            </div>
        </div>
      ) : activeTab === 'access' ? (
        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Invite Access Link</h2>
                <p className="mt-1 text-sm text-muted">
                  Share this URL to invite users into your campaign workspace.
                </p>
              </div>
              <div className="rounded-full border border-border bg-elevated px-3 py-1 text-xs font-medium text-foreground">
                Token:{' '}
                {inviteLink.inviteToken
                  ? `${inviteLink.inviteToken.slice(0, 8)}...`
                  : 'loading'}
              </div>
            </div>
            {(accessError || inviteLink.error) && (
              <div className="mt-4 rounded border border-red-700 bg-red-950/50 p-3 text-sm text-red-200">
                {accessError || inviteLink.error}
              </div>
            )}
            <div className="mt-4 rounded-lg border border-border bg-background p-3">
              <code className="block overflow-x-auto text-sm text-foreground">
                {inviteLink.inviteUrl ||
                  (inviteLink.loading || accessLoading
                    ? 'Loading invite link...'
                    : 'Invite link unavailable')}
              </code>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleCopyInviteUrl()}
                disabled={!inviteLink.inviteUrl}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-500/60 bg-emerald-500 px-4 text-sm font-semibold text-background transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Copy className="h-4 w-4" />
                {inviteLink.copiedInvite ? 'Copied!' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={() => void handleRotateInvite()}
                disabled={!canManageAccess || rotatingInvite}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-elevated px-4 text-sm font-semibold text-foreground transition hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${rotatingInvite ? 'animate-spin' : ''}`} />
                {rotatingInvite ? 'Regenerating...' : 'Regenerate Link'}
              </button>
            </div>
            <CampaignInviteEmailForm
              disabled={!inviteLink.inviteUrl}
              emailAvailable={inviteLink.emailAvailable}
              onSend={inviteLink.sendInviteEmail}
            />
          </div>

          {canManageAccess && (
            <div className="rounded-lg border border-border bg-surface p-6">
              <h3 className="text-lg font-semibold text-white">Role capabilities</h3>
              <p className="mt-1 text-sm text-muted">
                Manage what each campaign role can access and change. View as
                Player or Public only remaps visibility in the campaign workspace
                — it does not impersonate accounts or change write capabilities.
              </p>
              <div className="mt-4">
                <CollaborationPermissionsPanel
                  campaignHandle={campaignHandle}
                  canManage={canManageAccess}
                  onSaved={() => void refreshWiki()}
                />
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Active Member Roster</h3>
                <p className="text-sm text-muted">
                  Manage membership and link each player to their character page. Players link
                  themselves from Campaign Home; linking assigns page ownership to that member.
                </p>
              </div>
            </div>

            {accessError && (
              <div className="mb-4 rounded border border-red-700 bg-red-950/50 p-3 text-sm text-red-200">
                {accessError}
              </div>
            )}

            {accessLoading ? (
              <div className="rounded border border-border bg-background p-4 text-sm text-muted">
                Loading members...
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full divide-y divide-border bg-background">
                  <thead className="bg-surface">
                    <tr>
                      <th className="px-4 py-3 text-left META_SECTION_LABEL_CLASS">User</th>
                      <th className="px-4 py-3 text-left META_SECTION_LABEL_CLASS">Identity page</th>
                      <th className="px-4 py-3 text-left META_SECTION_LABEL_CLASS">Current Role</th>
                      <th className="px-4 py-3 text-left META_SECTION_LABEL_CLASS">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {members.map((member) => {
                      const isBusy = updatingMemberId === member.userId;
                      const isIdentityBusy = updatingIdentityUserId === member.userId;
                      const isDmMember = member.role === 'GAMEMASTER';
                      const canEditIdentity = canManageMemberIdentity;
                      return (
                        <tr key={member.userId}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                name={member.name}
                                avatarUrl={member.avatarUrl}
                                userId={member.userId}
                                size="sm"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <MemberIdentityLabel
                                    source={{
                                      label: member.label,
                                      displayName: member.identityPageTitle,
                                      playerContext: member.playerContext ?? member.name,
                                      identityPageId: member.identityPageId,
                                    }}
                                    primaryClassName="text-sm font-medium text-foreground"
                                  />
                                  {isDmMember && (
                                    <span
                                      title="Campaign Creator / Dungeon Master"
                                      className="rounded-full border border-primary/50 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
                                    >
                                      Campaign Creator
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {canEditIdentity ? (
                              <IdentityPagePicker
                                flatPages={flatPages}
                                defaultOptions={characterPages}
                                searchOptions={flatPages}
                                placeholder="Search character pages…"
                                clearLabel="No character linked"
                                value={member.identityPageId ?? null}
                                disabled={isIdentityBusy}
                                onChange={(pageId) =>
                                  handleMemberIdentityChange(member.userId, pageId)
                                }
                              />
                            ) : (
                              <span className="text-sm text-muted">
                                {member.identityPageTitle ?? '—'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={member.role}
                              disabled={!canManageAccess || member.isCampaignOwner || isBusy}
                              onChange={(e) => void handleMemberRoleChange(member.userId, e.target.value as AccessRole)}
                              className="h-9 rounded border border-border bg-elevated px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <option value="GAMEMASTER">Game Master</option>
                              <option value="WRITER">Writer</option>
                              <option value="PARTICIPANT">Player</option>
                              <option value="OBSERVER">Observer</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            {isDmMember ? (
                              <span
                                title="Dungeon Master membership is permanent."
                                className="inline-flex h-9 items-center rounded border border-border bg-surface px-3 text-xs font-medium text-muted"
                              >
                                Protected
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {member.role === 'WRITER' &&
                                members.some((entry) => entry.userId === user?.id && entry.isCampaignOwner) ? (
                                  <button
                                    type="button"
                                    disabled={!canManageAccess || isBusy}
                                    onClick={() => void handleOfferOwnership(member)}
                                    className="h-9 rounded border border-primary/50 bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Offer ownership
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={!canManageAccess || member.isCampaignOwner || isBusy}
                                  onClick={() => void handleRemoveMember(member)}
                                  className="h-9 rounded border border-red-700 bg-red-600 px-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'recruitment' ? (
        <RecruitmentSettingsTab campaignHandle={campaignHandle} />
      ) : activeTab === 'scheduling' ? (
        <SchedulingSettingsTab campaignHandle={campaignHandle} />
      ) : activeTab === 'audio' ? (
        <CampaignAudioSettingsTab campaignHandle={campaignHandle} />
      ) : activeTab === 'timeline' ? (
        <TimelineSettingsTab campaignHandle={campaignHandle} />
      ) : activeTab === 'world-development' ? (
        canManageSidebar ? (
          <WorldDevelopmentSettingsTab campaignHandle={campaignHandle} />
        ) : (
          <Navigate to={campaignSettingsPath(campaignHandle)} replace />
        )
      ) : activeTab === 'appearance' ? (
        <div className="space-y-6">
          <CampaignAppearanceSettingsTab
            campaignHandle={campaignHandle ?? ''}
            initialAppearanceProfile={campaignAppearance}
            initialThemePreset={themePreset}
            onSaved={refreshWiki}
          />
          {canManageSidebar ? (
            <div className="rounded-lg border border-border bg-surface p-6">
              <h2 className="mb-2 text-lg font-semibold text-white">Sidebar Layout</h2>
              <p className="mb-4 text-sm text-muted">
                Reorder sections and labels to match your campaign style.
              </p>
              <SidebarSettingsTab campaignHandle={campaignHandle} />
            </div>
          ) : null}
        </div>
      ) : activeTab === 'integrations' ? (
        <div className="space-y-6">
          <CampaignDiscordSettings campaignHandle={campaignHandle} />
          <CampaignWebhooksSettings campaignHandle={campaignHandle} />
          <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="mb-2 text-lg font-semibold text-white">Integrations</h2>
            <p className="text-sm text-muted">
              Install and configure plugins scoped to this campaign.
            </p>
          </div>
          {wikiCampaign?.id ? (
            <CampaignPluginsSettingsTab
              campaignId={wikiCampaign.id}
              campaignHandle={campaignHandle}
            />
          ) : (
            <p className="text-sm text-muted">Loading campaign…</p>
          )}
        </div>
      ) : activeTab === 'advanced' ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="mb-2 text-lg font-semibold text-white">Advanced</h2>
            <p className="text-sm text-muted">
              Capacity guidance, file audit, and backup controls.
            </p>
          </div>
          <StatusTab />
          {canManageSidebar ? (
            <CampaignBackupTab campaignHandle={campaignHandle} />
          ) : (
            <div className="rounded-lg border border-border bg-surface p-6">
              <p className="text-sm text-muted">
                Data backup tools are available to Game Masters and Writers.
              </p>
            </div>
          )}
        </div>
      ) : null}

      {wikiCampaign?.id ? (
        <>
          <ArchiveCampaignModal
            open={showArchiveModal}
            campaignId={wikiCampaign.id}
            campaignName={name || wikiCampaign.name}
            onClose={() => setShowArchiveModal(false)}
            onArchived={() => {
              window.location.href = '/campaigns';
            }}
          />
          <DeleteCampaignModal
            open={showDeleteModal}
            campaignId={wikiCampaign.id}
            campaignName={name || wikiCampaign.name}
            onClose={() => setShowDeleteModal(false)}
          />
        </>
      ) : null}
      </div>
    </PageShell>
  );
}
