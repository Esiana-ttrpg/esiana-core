import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, BookOpen, KeyRound, Palette, Shield, UserCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  changeUserPassword,
  deleteMyAccount,
  fetchUserProfile,
  uploadUserAvatar,
  updateUserProfile,
} from '@/lib/user';
import type { UserProfile } from '@/types/user';
import { DeveloperApiKeysSection } from '@/components/settings/DeveloperApiKeysSection';
import { UserQuotaCard } from '@/components/settings/UserQuotaCard';
import { PageContainer } from '@/components/layout/PageContainer';
import { UserAppearanceSection } from '@/components/settings/UserAppearanceSection';
import { UserNotificationsSection } from '@/components/settings/UserNotificationsSection';
import { ResponsiveSectionNav } from '@/components/settings/ResponsiveSectionNav';
import { UserProfileIdentitySection } from '@/components/settings/UserProfileIdentitySection';
import { UserAccountSecuritySection } from '@/components/settings/UserAccountSecuritySection';
import { UserLinkedIdentitySection } from '@/components/settings/UserLinkedIdentitySection';
import { UserCampaignDefaultsSection } from '@/components/settings/UserCampaignDefaultsSection';
import { UserUiLanguageSection } from '@/components/settings/UserUiLanguageSection';
import { SettingsPageLayout } from '@/components/settings/SettingsPageLayout';

type SettingsTab =
  | 'profile'
  | 'appearance'
  | 'campaignDefaults'
  | 'notifications'
  | 'developer'
  | 'account';

const SETTINGS_TAB_META: Array<{ id: SettingsTab; labelKey: string; icon: LucideIcon }> = [
  { id: 'profile', labelKey: 'profile.profile.tabProfile', icon: UserCircle },
  { id: 'appearance', labelKey: 'profile.profile.tabAppearance', icon: Palette },
  {
    id: 'campaignDefaults',
    labelKey: 'profile.profile.tabCampaignDefaults',
    icon: BookOpen,
  },
  { id: 'notifications', labelKey: 'profile.profile.tabNotifications', icon: Bell },
  { id: 'developer', labelKey: 'profile.profile.tabDeveloper', icon: KeyRound },
  { id: 'account', labelKey: 'profile.profile.tabAccount', icon: Shield },
];

const TAB_DESCRIPTION_KEYS: Record<SettingsTab, string> = {
  profile: 'profile.profile.descProfile',
  appearance: 'profile.profile.descAppearance',
  campaignDefaults: 'profile.profile.descCampaignDefaults',
  notifications: 'profile.profile.descNotifications',
  developer: 'profile.profile.descDeveloper',
  account: 'profile.profile.descAccount',
};

const VALID_TABS = new Set<string>(SETTINGS_TAB_META.map((tab) => tab.id));

function parseTabParam(value: string | null): SettingsTab {
  if (value && VALID_TABS.has(value)) return value as SettingsTab;
  return 'profile';
}

function getAccountDayCount(isoDate: string): number {
  const created = new Date(isoDate);
  if (Number.isNaN(created.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - created.getTime()) / 86_400_000));
}

function formatMemberSince(isoDate: string, locale?: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export function UserSettings() {
  const { t, i18n } = useTranslation();
  const settingsTabs = useMemo(
    () =>
      SETTINGS_TAB_META.map((tab) => ({
        id: tab.id,
        label: t(tab.labelKey),
        icon: tab.icon,
      })),
    [t],
  );
  const { isAuthenticated, loading: authLoading, refresh, logout, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [displayNameInput, setDisplayNameInput] = useState('');
  const [pronounsInput, setPronounsInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [publicBioInput, setPublicBioInput] = useState('');
  const [statusBlurbInput, setStatusBlurbInput] = useState('');
  const [blueskyInput, setBlueskyInput] = useState('');
  const [discordInput, setDiscordInput] = useState('');
  const [githubInput, setGithubInput] = useState('');
  const [redditInput, setRedditInput] = useState('');
  const [mastodonInput, setMastodonInput] = useState('');
  const [otherLinkInput, setOtherLinkInput] = useState('');
  const [timezoneInput, setTimezoneInput] = useState('');

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const activeTab = parseTabParam(searchParams.get('tab'));
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  function switchTab(tab: SettingsTab) {
    setSearchParams({ tab }, { replace: true });
    setProfileError(null);
    setProfileMessage(null);
    setEmailError(null);
    setEmailMessage(null);
    setPasswordError(null);
    setPasswordMessage(null);
  }

  useEffect(() => {
    if (searchParams.get('tab') === 'campaigns') {
      navigate('/campaigns', { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    fetchUserProfile()
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setDisplayNameInput(data.displayName ?? '');
          setPronounsInput(data.pronouns ?? '');
          setEmailInput(data.email);
          setPublicBioInput(data.publicBio ?? '');
          setStatusBlurbInput(data.statusBlurb ?? '');
          setBlueskyInput(data.bluesky ?? '');
          setDiscordInput(data.discord ?? '');
          setGithubInput(data.github ?? '');
          setRedditInput(data.reddit ?? '');
          setMastodonInput(data.mastodon ?? '');
          setOtherLinkInput(data.otherLink ?? '');
          setTimezoneInput(data.timezone ?? '');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : t('profile.profile.loadFailed'),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, t]);

  const memberSince = useMemo(
    () =>
      profile ? formatMemberSince(profile.createdAt, i18n.language) : '',
    [profile, i18n.language],
  );

  const accountDayCount = useMemo(
    () => (profile ? getAccountDayCount(profile.createdAt) : 0),
    [profile],
  );

  async function handleUpdateProfile(event: FormEvent) {
    event.preventDefault();
    setProfileError(null);
    setProfileMessage(null);
    setProfileSaving(true);

    try {
      const updated = await updateUserProfile({
        displayName: displayNameInput,
        pronouns: pronounsInput,
        publicBio: publicBioInput,
        statusBlurb: statusBlurbInput,
        bluesky: blueskyInput,
        discord: discordInput,
        github: githubInput,
        reddit: redditInput,
        mastodon: mastodonInput,
        otherLink: otherLinkInput,
        timezone: timezoneInput.trim() || null,
      });
      setProfile(updated);
      setDisplayNameInput(updated.displayName ?? '');
      setPronounsInput(updated.pronouns ?? '');
      setPublicBioInput(updated.publicBio ?? '');
      setStatusBlurbInput(updated.statusBlurb ?? '');
      setBlueskyInput(updated.bluesky ?? '');
      setDiscordInput(updated.discord ?? '');
      setGithubInput(updated.github ?? '');
      setRedditInput(updated.reddit ?? '');
      setMastodonInput(updated.mastodon ?? '');
      setOtherLinkInput(updated.otherLink ?? '');
      setTimezoneInput(updated.timezone ?? '');
      setProfileMessage('Profile updated.');
      await refresh();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleSaveEmail(event: FormEvent) {
    event.preventDefault();
    setEmailError(null);
    setEmailMessage(null);
    setEmailSaving(true);

    try {
      const updated = await updateUserProfile({ email: emailInput });
      setProfile(updated);
      setEmailInput(updated.email);
      setEmailMessage('Email updated.');
      await refresh();
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Unable to update email.');
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await changeUserPassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Password updated successfully.');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Unable to change password.');
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleAvatarSelected(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      setProfileError('Please choose an image file.');
      return;
    }
    setAvatarUploading(true);
    setProfileError(null);
    try {
      const updated = await uploadUserAvatar(file);
      setProfile(updated);
      setProfileMessage('Avatar updated.');
      await refresh();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Unable to upload avatar.');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleDeleteAccount(): Promise<void> {
    const confirm = window.prompt(
      'Type DELETE to permanently remove your account and avatar.',
    );
    if (confirm !== 'DELETE') return;
    setDeletingAccount(true);
    try {
      await deleteMyAccount();
      await logout();
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Unable to delete account.');
      setDeletingAccount(false);
    }
  }

  if (!authLoading && !isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || loading) {
    return <LoadingSpinner label={t('profile.profile.loadingLabel')} />;
  }

  return (
    <PageContainer className="gap-8">
      <SettingsPageLayout className="flex flex-col gap-8">
        <header className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <UserCircle className="size-7" strokeWidth={1.5} />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('profile.profile.pageTitle')}
            </h1>
          </div>
          <p className="text-sm text-muted">{t(TAB_DESCRIPTION_KEYS[activeTab])}</p>
        </header>

        <ResponsiveSectionNav
          sections={settingsTabs}
          activeId={activeTab}
          onChange={switchTab}
          ariaLabel={t('profile.profile.sectionNavAria')}
          mobileLabel={t('profile.profile.sectionNavMobile')}
        />

        {loadError && (
          <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {loadError}
          </p>
        )}

        {profile && activeTab === 'profile' && (
        <UserProfileIdentitySection
          profile={profile}
          displayNameInput={displayNameInput}
          setDisplayNameInput={setDisplayNameInput}
          pronounsInput={pronounsInput}
          setPronounsInput={setPronounsInput}
          publicBioInput={publicBioInput}
          setPublicBioInput={setPublicBioInput}
          statusBlurbInput={statusBlurbInput}
          setStatusBlurbInput={setStatusBlurbInput}
          blueskyInput={blueskyInput}
          setBlueskyInput={setBlueskyInput}
          discordInput={discordInput}
          setDiscordInput={setDiscordInput}
          githubInput={githubInput}
          setGithubInput={setGithubInput}
          redditInput={redditInput}
          setRedditInput={setRedditInput}
          mastodonInput={mastodonInput}
          setMastodonInput={setMastodonInput}
          otherLinkInput={otherLinkInput}
          setOtherLinkInput={setOtherLinkInput}
          timezoneInput={timezoneInput}
          setTimezoneInput={setTimezoneInput}
          avatarUploading={avatarUploading}
          onAvatarSelected={(file) => void handleAvatarSelected(file)}
          saving={profileSaving}
          error={profileError}
          message={profileMessage}
          onSubmit={handleUpdateProfile}
        />
      )}

      {profile && activeTab === 'account' && (
        <>
        <UserLinkedIdentitySection
          authErrorCode={searchParams.get('authError')}
          linkedSuccessId={searchParams.get('linked')}
        />
        <UserAccountSecuritySection
          profile={profile}
          emailInput={emailInput}
          setEmailInput={setEmailInput}
          memberSince={memberSince}
          accountDayCount={accountDayCount}
          emailSaving={emailSaving}
          emailError={emailError}
          emailMessage={emailMessage}
          onSaveEmail={handleSaveEmail}
          currentPassword={currentPassword}
          setCurrentPassword={setCurrentPassword}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          passwordSaving={passwordSaving}
          passwordError={passwordError}
          passwordMessage={passwordMessage}
          onChangePassword={handleChangePassword}
          passwordAuthEnabled={user?.passwordAuthEnabled !== false}
          deletingAccount={deletingAccount}
          onDeleteAccount={() => void handleDeleteAccount()}
        />
        </>
      )}

      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <UserUiLanguageSection />
          <UserAppearanceSection />
        </div>
      )}

      {activeTab === 'campaignDefaults' && <UserCampaignDefaultsSection />}

      {activeTab === 'notifications' && <UserNotificationsSection />}

      {profile && activeTab === 'developer' && (
        <div className="space-y-6">
          <DeveloperApiKeysSection />
          <UserQuotaCard />
        </div>
      )}
      </SettingsPageLayout>
    </PageContainer>
  );
}
