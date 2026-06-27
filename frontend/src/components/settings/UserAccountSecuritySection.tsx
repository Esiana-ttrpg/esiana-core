import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import { FormEvent } from 'react';
import { KeyRound, Shield } from 'lucide-react';
import { FieldHint, FieldLabel } from '@/components/settings/settingsFormHelpers';
import { controlClasses } from '@/components/ui/formStyles';
import type { UserProfile } from '@/types/user';

export interface UserAccountSecuritySectionProps {
  profile: UserProfile;
  emailInput: string;
  setEmailInput: (value: string) => void;
  memberSince: string;
  accountDayCount: number;
  emailSaving: boolean;
  emailError: string | null;
  emailMessage: string | null;
  onSaveEmail: (event: FormEvent) => void;
  currentPassword: string;
  setCurrentPassword: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  passwordSaving: boolean;
  passwordError: string | null;
  passwordMessage: string | null;
  onChangePassword: (event: FormEvent) => void;
  passwordAuthEnabled?: boolean;
  deletingAccount: boolean;
  onDeleteAccount: () => void;
}

export function UserAccountSecuritySection({
  profile,
  emailInput,
  setEmailInput,
  memberSince,
  accountDayCount,
  emailSaving,
  emailError,
  emailMessage,
  onSaveEmail,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordSaving,
  passwordError,
  passwordMessage,
  onChangePassword,
  passwordAuthEnabled = true,
  deletingAccount,
  onDeleteAccount,
}: UserAccountSecuritySectionProps) {
  return (
    <div className="space-y-6">
      <form
        onSubmit={onSaveEmail}
        className="rounded-xl border border-border bg-surface p-4"
      >
        <div className="mb-4 flex items-center gap-2">
          <Shield className="size-4 shrink-0 text-primary/90" />
          <h2 className={META_FIELD_LABEL_CLASS}>
            Account Details
          </h2>
        </div>

        <label className="block">
          <FieldLabel>Email Address</FieldLabel>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            required
            className={controlClasses}
            autoComplete="email"
          />
          <FieldHint>Used for login and account recovery.</FieldHint>
        </label>

        <dl className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
          <div>
            <dt className={META_FIELD_LABEL_CLASS}>
              System Username
            </dt>
            <dd className="mt-0.5 break-all font-mono text-foreground">@{profile.username}</dd>
          </div>
          <div>
            <dt className={META_FIELD_LABEL_CLASS}>
              Member Since
            </dt>
            <dd className="mt-0.5 text-muted">{memberSince}</dd>
          </div>
          <div>
            <dt className={META_FIELD_LABEL_CLASS}>
              Account Age
            </dt>
            <dd className="mt-0.5 text-muted">
              {accountDayCount} day{accountDayCount === 1 ? '' : 's'} on Esiana
            </dd>
          </div>
        </dl>

        {emailError && <p className="mt-3 text-sm text-red-300">{emailError}</p>}
        {emailMessage && <p className="mt-3 text-sm text-emerald-400">{emailMessage}</p>}

        <button
          type="submit"
          disabled={emailSaving}
          className="mt-4 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background hover:bg-primary-hover disabled:opacity-50"
        >
          {emailSaving ? 'Saving…' : 'Update email'}
        </button>
      </form>

      {passwordAuthEnabled ? (
        <form
          onSubmit={onChangePassword}
          className="rounded-xl border border-primary/25 bg-surface/90 p-4"
        >
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="size-4 shrink-0 text-primary/90" />
            <h2 className={META_FIELD_LABEL_CLASS}>
              Change Password
            </h2>
          </div>

          <div className="space-y-3">
            <label className="block">
              <FieldLabel>Current Password</FieldLabel>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className={controlClasses}
              />
            </label>
            <label className="block">
              <FieldLabel>New Password</FieldLabel>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className={controlClasses}
              />
            </label>
            <label className="block">
              <FieldLabel>Confirm New Password</FieldLabel>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className={controlClasses}
              />
            </label>

            {passwordError && <p className="text-sm text-red-300">{passwordError}</p>}
            {passwordMessage && <p className="text-sm text-emerald-400">{passwordMessage}</p>}

            <button
              type="submit"
              disabled={passwordSaving}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background hover:bg-primary-hover disabled:opacity-50 sm:w-auto"
            >
              {passwordSaving ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-border bg-surface/90 p-4">
          <div className="mb-2 flex items-center gap-2">
            <KeyRound className="size-4 shrink-0 text-primary/90" />
            <h2 className={META_FIELD_LABEL_CLASS}>
              Password Sign-In
            </h2>
          </div>
          <p className="text-sm text-muted">
            This account uses external sign-in only. Use your identity provider to manage access.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4">
        <h2 className={`mb-2 ${META_FIELD_LABEL_CLASS} text-red-300`}>
          Danger Zone
        </h2>
        <p className="mb-3 text-xs text-muted">
          Deleting your account is permanent. Your profile and uploaded avatar file will be
          removed.
        </p>
        <button
          type="button"
          onClick={() => void onDeleteAccount()}
          disabled={deletingAccount}
          className="min-h-11 rounded-lg border border-red-500/50 bg-red-950/50 px-4 py-2.5 text-xs font-semibold text-red-200 hover:bg-red-900/50 disabled:opacity-50"
        >
          {deletingAccount ? 'Deleting…' : 'Delete Account'}
        </button>
      </div>
    </div>
  );
}
