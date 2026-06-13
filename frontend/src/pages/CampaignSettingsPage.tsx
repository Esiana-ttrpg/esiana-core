import { useEffect, useMemo, useState } from 'react';
import { Copy, RefreshCw, Settings } from 'lucide-react';
import { useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWiki } from '@/contexts/WikiContext';
import { StatusTab } from '@/components/StatusTab';
import { WorldActivityView } from '@/components/wiki/WorldActivityView';
import { WritingPulseView } from '@/components/wiki/WritingPulseView';
import { CampaignBackupTab } from '@/components/campaign/CampaignBackupTab';
import { CampaignPluginsSettingsTab } from '@/components/campaign/CampaignPluginsSettingsTab';
import { RecruitmentSettingsTab } from '@/components/campaign/RecruitmentSettingsTab';
import { SchedulingSettingsTab } from '@/components/campaign/SchedulingSettingsTab';
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
import {
  campaignDashboardPath,
  campaignSettingsPath,
  type CampaignSettingsTab,
} from '@/lib/campaignPaths';
import { isElevatedMembershipRole } from '@/types/domain';
import { isCharacterWikiPage } from '@/lib/isCharacterWikiPage';

const SETTINGS_TABS = [
  'general',
  'access',
  'recruitment',
  'scheduling',
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
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token, user } = useAuth();
  const { campaign: wikiCampaign, flatPages, refresh: refreshWiki } = useWiki();
  const canManageSidebar =
    wikiCampaign?.role === 'GAMEMASTER' || wikiCampaign?.role === 'WRITER';
  const canManageAccess = wikiCampaign?.isCampaignOwner === true;
  const canManageMemberIdentity =
    wikiCampaign?.role === 'GAMEMASTER' || wikiCampaign?.role === 'WRITER';
  const canAccessCampaignSettings =
    wikiCampaign?.role != null && isElevatedMembershipRole(wikiCampaign.role);

  const characterPages = useMemo(
    () => flatPages.filter(isCharacterWikiPage),
    [flatPages],
  );

  const [activeTab, setActiveTab] = useState<CampaignSettingsTab>(() =>
    parseSettingsTab(searchParams.get('tab')),
  );

  useEffect(() => {
    const tabFromUrl = parseSettingsTab(searchParams.get('tab'));
    setActiveTab((current) => (current === tabFromUrl ? current : tabFromUrl));
  }, [searchParams]);

  function selectTab(tab: CampaignSettingsTab) {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === 'general') {
      next.delete('tab');
    } else {
      next.set('tab', tab);
    }
    setSearchParams(next, { replace: true });
  }

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
    const fetchCampaign = async () => {
      if (!campaignHandle) return;

      try {
        const response = await fetch(`/api/campaigns/${campaignHandle}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!response.ok) throw new Error('Failed to fetch campaign');

        const data = await response.json();
        setName(data.campaign.name || '');
        setDescription(data.campaign.description ?? '');
        setDiscoverability(normalizeDiscoverability(data.campaign.discoverability));
        setLanguage(data.campaign.language ?? 'English');
        setGameSystem(data.campaign.gameSystem ?? DEFAULT_GAME_SYSTEM_SLUG);
        setCustomGameSystemName(data.campaign.customGameSystemName ?? null);
        const loadedPreset = data.campaign.themePreset ?? 'dark';
        setThemePreset(
          isThemePresetId(loadedPreset) ? loadedPreset : 'dark',
        );
        if (isAppearanceProfileDefined(data.campaign.appearanceProfile)) {
          setCampaignAppearance(
            normalizeThemeProfile(data.campaign.appearanceProfile),
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
        setSettingsError('Failed to load campaign settings');
      }
    };

    fetchCampaign();
  }, [campaignHandle, token]);

  useEffect(() => {
    if (activeTab !== 'access' || !campaignHandle) return;

    const fetchMembers = async () => {
      setAccessLoading(true);
      setAccessError('');
      try {
        const membersResponse = await fetch(`/api/campaigns/${campaignHandle}/members`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!membersResponse.ok) {
          const data = (await membersResponse.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            data.error || `Failed to load campaign members (HTTP ${membersResponse.status})`,
          );
        }

        const membersData = (await membersResponse.json()) as {
          members: CampaignAccessMember[];
        };
        setMembers(membersData.members ?? []);
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
            : 'Failed to load access control data.',
        );
      } finally {
        setAccessLoading(false);
      }
    };

    void fetchMembers();
  }, [activeTab, campaignHandle, token]);

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
      const response = await fetch(`/api/campaigns/${campaignHandle}/invite/rotate`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to rotate invite');
      }
      await response.json();
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
      const response = await fetch(`/api/campaigns/${campaignHandle}/members/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update member role');
      }
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
      const response = await fetch(
        `/api/campaigns/${campaignHandle}/members/${userId}/identity`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ identityPageId }),
        },
      );
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || 'Failed to update identity mapping');
      }
      const data = (await response.json()) as { member: CampaignAccessMember };
      setMembers((prev) =>
        prev.map((member) =>
          member.userId === userId ? { ...member, ...data.member } : member,
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
      const response = await fetch(`/api/campaigns/${campaignHandle}/members/${member.userId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }
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
      setSettingsError('Campaign name is required');
      setSettingsLoading(false);
      return;
    }

    if (gameSystem === 'other' && !customGameSystemName?.trim()) {
      setSettingsError('Enter a custom game system name when selecting Other.');
      setSettingsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/campaigns/${campaignHandle}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          discoverability,
          language: language?.trim() || null,
          gameSystem: gameSystem?.trim() || null,
          customGameSystemName:
            gameSystem === 'other' ? customGameSystemName?.trim() || null : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setSettingsError(data.error || 'Failed to save campaign settings');
        return;
      }

      const data = await response.json();
      setName(data.campaign.name);
      setDescription(data.campaign.description ?? '');
      setDiscoverability(normalizeDiscoverability(data.campaign.discoverability));
      setLanguage(data.campaign.language ?? 'English');
      setGameSystem(data.campaign.gameSystem ?? DEFAULT_GAME_SYSTEM_SLUG);
      setCustomGameSystemName(data.campaign.customGameSystemName ?? null);
      void refreshWiki();
      const nextHandle = data.campaign.handle as string | undefined;
      if (nextHandle && nextHandle !== campaignHandle) {
        navigate(campaignSettingsPath(nextHandle, activeTab), { replace: true });
      }
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving campaign settings:', err);
      setSettingsError('Failed to save campaign settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  if (wikiCampaign && !canAccessCampaignSettings) {
    return <Navigate to={campaignDashboardPath(campaignHandle)} replace />;
  }

  return (
    <PageShell width="standard" className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-white">Campaign Settings</h1>
            <p className="text-sm text-muted">
              Manage campaign details, privacy, and performance metrics in one place.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-full bg-surface p-2">
          {[
            { id: 'general', label: 'General' },
            { id: 'access', label: 'Access' },
            ...(canManageSidebar
              ? [{ id: 'appearance' as const, label: 'Appearance' }]
              : []),
            { id: 'recruitment', label: 'Recruitment' },
            { id: 'scheduling', label: 'Scheduling' },
            ...(canManageSidebar
              ? [{ id: 'world-development' as const, label: 'Development' }]
              : []),
            { id: 'integrations', label: 'Integrations' },
            { id: 'advanced', label: 'Advanced' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id as CampaignSettingsTab)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-elevated text-white'
                  : 'text-muted hover:bg-elevated hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'general' ? (
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">General Settings</h2>

          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-foreground">Campaign Name</label>
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
                        value: CampaignDiscoverability.UNLISTED,
                        label: 'Unlisted',
                        description:
                          'Anyone with the campaign link can browse the anonymous codex (read-only guest view). Not listed on the Global Hub.',
                      },
                      {
                        value: CampaignDiscoverability.PUBLIC,
                        label: 'Public',
                        description:
                          'Listed on the Global Hub and recruitment marketplace. Guests can browse the anonymous codex.',
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
                Campaign settings saved successfully.
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
              <h3 className="text-lg font-semibold text-white">Player permissions</h3>
              <p className="mt-1 text-sm text-muted">
                Control what Players and Observers can manage without Game Master or Writer roles.
                Defaults apply when no override is set.
              </p>
              <div className="mt-4">
                <CollaborationPermissionsPanel
                  campaignHandle={campaignHandle}
                  isCampaignOwner={canManageAccess}
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
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Identity page</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Current Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Actions</th>
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
            token={token}
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
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="mb-2 text-lg font-semibold text-white">Advanced</h2>
            <p className="text-sm text-muted">
              Review campaign metrics and backup controls.
            </p>
          </div>
          <StatusTab />
          <div className="rounded-lg border border-border bg-surface">
            <WorldActivityView campaignHandle={campaignHandle} />
          </div>
          <div className="rounded-lg border border-border bg-surface">
            <WritingPulseView campaignHandle={campaignHandle} />
          </div>
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
      )}

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
    </PageShell>
  );
}
