import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import { FormEvent } from 'react';
import { ProfileHeaderPreview } from '@/components/profile/ProfileHeaderPreview';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { TimezoneSelect } from '@/components/ui/TimezoneSelect';
import { SettingsStickyActions } from '@/components/settings/SettingsStickyActions';
import { FieldHint, FieldLabel } from '@/components/settings/settingsFormHelpers';
import { controlClasses, textareaClasses } from '@/components/ui/formStyles';
import type { UserProfile, UserProfileUpdateInput } from '@/types/user';

const STATUS_BLURB_MAX = 140;
const PRONOUNS_MAX = 48;

const SOCIAL_FIELDS: Array<{
  key: keyof Pick<
    UserProfileUpdateInput,
    'bluesky' | 'discord' | 'github' | 'reddit' | 'mastodon' | 'otherLink'
  >;
  label: string;
  placeholder: string;
}> = [
  { key: 'bluesky', label: 'Bluesky', placeholder: 'https://bsky.app/profile/you' },
  { key: 'discord', label: 'Discord', placeholder: 'https://discord.gg/invite' },
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/you' },
  { key: 'reddit', label: 'Reddit', placeholder: 'https://reddit.com/u/you' },
  { key: 'mastodon', label: 'Mastodon', placeholder: 'https://mastodon.social/@you' },
  { key: 'otherLink', label: 'Other link', placeholder: 'https://your-site.example' },
];

export interface UserProfileIdentitySectionProps {
  profile: UserProfile;
  displayNameInput: string;
  setDisplayNameInput: (value: string) => void;
  pronounsInput: string;
  setPronounsInput: (value: string) => void;
  publicBioInput: string;
  setPublicBioInput: (value: string) => void;
  statusBlurbInput: string;
  setStatusBlurbInput: (value: string) => void;
  blueskyInput: string;
  setBlueskyInput: (value: string) => void;
  discordInput: string;
  setDiscordInput: (value: string) => void;
  githubInput: string;
  setGithubInput: (value: string) => void;
  redditInput: string;
  setRedditInput: (value: string) => void;
  mastodonInput: string;
  setMastodonInput: (value: string) => void;
  otherLinkInput: string;
  setOtherLinkInput: (value: string) => void;
  timezoneInput: string;
  setTimezoneInput: (value: string) => void;
  avatarUploading: boolean;
  onAvatarSelected: (file: File) => void;
  saving: boolean;
  error: string | null;
  message: string | null;
  onSubmit: (event: FormEvent) => void;
}

export function UserProfileIdentitySection({
  profile,
  displayNameInput,
  setDisplayNameInput,
  pronounsInput,
  setPronounsInput,
  publicBioInput,
  setPublicBioInput,
  statusBlurbInput,
  setStatusBlurbInput,
  blueskyInput,
  setBlueskyInput,
  discordInput,
  setDiscordInput,
  githubInput,
  setGithubInput,
  redditInput,
  setRedditInput,
  mastodonInput,
  setMastodonInput,
  otherLinkInput,
  setOtherLinkInput,
  timezoneInput,
  setTimezoneInput,
  avatarUploading,
  onAvatarSelected,
  saving,
  error,
  message,
  onSubmit,
}: UserProfileIdentitySectionProps) {
  const socialValues: Record<(typeof SOCIAL_FIELDS)[number]['key'], string> = {
    bluesky: blueskyInput,
    discord: discordInput,
    github: githubInput,
    reddit: redditInput,
    mastodon: mastodonInput,
    otherLink: otherLinkInput,
  };

  const socialSetters: Record<
    (typeof SOCIAL_FIELDS)[number]['key'],
    (value: string) => void
  > = {
    bluesky: setBlueskyInput,
    discord: setDiscordInput,
    github: setGithubInput,
    reddit: setRedditInput,
    mastodon: setMastodonInput,
    otherLink: setOtherLinkInput,
  };

  return (
    <form id="profile-settings-form" onSubmit={onSubmit} className="space-y-6">
      <ProfileHeaderPreview
        userId={profile.id}
        username={profile.username}
        draft={{
          displayName: displayNameInput,
          pronouns: pronounsInput,
          statusBlurb: statusBlurbInput,
          bluesky: blueskyInput,
          discord: discordInput,
          github: githubInput,
          reddit: redditInput,
          mastodon: mastodonInput,
          otherLink: otherLinkInput,
        }}
      />

      <div className="rounded-xl border border-border bg-surface/50 p-4">
        <FieldLabel>Avatar</FieldLabel>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <UserAvatar
            name={displayNameInput || profile.username}
            avatarUrl={profile.avatarUrl}
            userId={profile.id}
            size="lg"
          />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/70 hover:text-primary">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAvatarSelected(file);
                e.currentTarget.value = '';
              }}
            />
            {avatarUploading ? 'Uploading…' : 'Upload Avatar'}
          </label>
        </div>
        <FieldHint>Shown on your public profile and in campaigns.</FieldHint>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block min-w-0">
          <FieldLabel>Display Name</FieldLabel>
          <input
            type="text"
            value={displayNameInput}
            onChange={(e) => setDisplayNameInput(e.target.value)}
            maxLength={64}
            placeholder={profile.username}
            className={controlClasses}
            autoComplete="nickname"
          />
          <FieldHint>Your public screen name inside campaigns.</FieldHint>
        </label>

        <label className="block min-w-0">
          <FieldLabel>Pronouns</FieldLabel>
          <input
            type="text"
            value={pronounsInput}
            onChange={(e) => setPronounsInput(e.target.value)}
            maxLength={PRONOUNS_MAX}
            placeholder="e.g., they/them, she/her, he/him"
            className={controlClasses}
            autoComplete="off"
          />
          <FieldHint>Shown in parentheses next to your name on your public profile.</FieldHint>
        </label>
      </div>

      <label className="block min-w-0">
        <div className="mb-1 flex items-center justify-between gap-2">
          <FieldLabel>Profile Status Blurb</FieldLabel>
          <span
            className={`text-xs tabular-nums ${
              statusBlurbInput.length >= STATUS_BLURB_MAX ? 'text-primary' : 'text-muted'
            }`}
          >
            {statusBlurbInput.length}/{STATUS_BLURB_MAX}
          </span>
        </div>
        <input
          type="text"
          value={statusBlurbInput}
          onChange={(e) => setStatusBlurbInput(e.target.value)}
          maxLength={STATUS_BLURB_MAX}
          placeholder="Looking for 2 players for Saturday horror one-shots"
          className={controlClasses}
        />
        <FieldHint>Appears inline next to your name on your public profile.</FieldHint>
      </label>

      <fieldset className="min-w-0 rounded-xl border border-border bg-surface/50 p-4">
        <legend className={`mb-3 px-1 ${META_FIELD_LABEL_CLASS}`}>
          Social Links
        </legend>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {SOCIAL_FIELDS.map((field) => (
            <label key={field.key} className="block min-w-0">
              <FieldLabel>{field.label}</FieldLabel>
              <input
                type="url"
                value={socialValues[field.key]}
                onChange={(e) => socialSetters[field.key](e.target.value)}
                placeholder={field.placeholder}
                className={controlClasses}
              />
            </label>
          ))}
        </div>
        <FieldHint>Leave blank to hide an icon on your public profile.</FieldHint>
      </fieldset>

      <fieldset className="min-w-0 rounded-xl border border-border bg-surface/50 p-4">
        <legend className={`mb-3 px-1 ${META_FIELD_LABEL_CLASS}`}>
          Regional
        </legend>
        <label className="block min-w-0">
          <FieldLabel>Timezone</FieldLabel>
          <TimezoneSelect
            id="user-timezone"
            value={timezoneInput}
            onChange={setTimezoneInput}
            allowEmpty
            emptyLabel="Use instance default"
          />
          <FieldHint>
            Used for session schedules and date display.
            {profile.effectiveTimezone ? (
              <>
                {' '}
                Currently resolved as{' '}
                <span className="font-medium text-foreground">{profile.effectiveTimezone}</span>.
              </>
            ) : null}
          </FieldHint>
        </label>
      </fieldset>

      <label className="block min-w-0">
        <FieldLabel>Public DM / Player Bio</FieldLabel>
        <textarea
          value={publicBioInput}
          onChange={(e) => setPublicBioInput(e.target.value)}
          rows={8}
          maxLength={8000}
          placeholder="Introduce your playstyle, experience, house rules, and table expectations…"
          className={textareaClasses}
        />
        <FieldHint>
          Shown on your public profile and recruitment listings. Markdown is supported.
        </FieldHint>
      </label>

      {error && <p className="text-sm text-red-300">{error}</p>}
      {message && <p className="text-sm text-emerald-400">{message}</p>}

      <SettingsStickyActions>
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background hover:bg-primary-hover disabled:opacity-50 sm:w-auto sm:min-w-[12rem]"
        >
          {saving ? 'Saving…' : 'Update public profile'}
        </button>
      </SettingsStickyActions>
    </form>
  );
}
