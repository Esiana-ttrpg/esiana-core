import { useCallback, useEffect, useState } from 'react';
import { Link2, Unlink } from 'lucide-react';
import { FieldHint, FieldLabel } from '@/components/settings/settingsFormHelpers';
import { controlClasses } from '@/components/ui/formStyles';
import {
  addPasswordSignIn,
  AUTH_ERROR_MESSAGES,
  fetchLinkedAccounts,
  federatedSignInUrl,
  removePasswordSignIn,
  unlinkIdentityProvider,
  type LinkedAccountsPayload,
} from '@/lib/federatedIdentity';

interface UserLinkedIdentitySectionProps {
  authErrorCode?: string | null;
  linkedSuccessId?: string | null;
}

export function UserLinkedIdentitySection({
  authErrorCode,
  linkedSuccessId,
}: UserLinkedIdentitySectionProps) {
  const [data, setData] = useState<LinkedAccountsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchLinkedAccounts();
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load linked providers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (authErrorCode) {
      setError(
        AUTH_ERROR_MESSAGES[authErrorCode] ??
          'Something went wrong during identity provider sign-in.',
      );
    }
  }, [authErrorCode]);

  useEffect(() => {
    if (linkedSuccessId) {
      setMessage('Identity provider linked successfully.');
    }
  }, [linkedSuccessId]);

  async function handleUnlink(providerId: string) {
    setBusy(providerId);
    setError(null);
    setMessage(null);
    try {
      await unlinkIdentityProvider(providerId);
      setMessage('Identity provider unlinked.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to unlink provider');
    } finally {
      setBusy(null);
    }
  }

  async function handleAddPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy('password-add');
    setError(null);
    setMessage(null);
    try {
      await addPasswordSignIn({ password: newPassword, confirmPassword });
      setMessage('Password sign-in enabled.');
      setNewPassword('');
      setConfirmPassword('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to set password');
    } finally {
      setBusy(null);
    }
  }

  async function handleRemovePassword() {
    if (
      !window.confirm(
        'Remove password sign-in? You will only be able to sign in through linked identity providers.',
      )
    ) {
      return;
    }
    setBusy('password-remove');
    setError(null);
    setMessage(null);
    try {
      await removePasswordSignIn();
      setMessage('Password sign-in removed.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove password');
    } finally {
      setBusy(null);
    }
  }

  if (loading && !data) {
    return <p className="text-sm text-muted">Loading linked identity providers…</p>;
  }

  const passwordEnabled = data?.passwordAuthEnabled ?? true;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center gap-2">
          <Link2 className="size-4 shrink-0 text-primary/90" />
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Linked identity providers
          </h2>
        </div>
        <FieldHint>
          Federated sign-in from your organization&apos;s OIDC provider (Authentik, Keycloak, etc.).
        </FieldHint>

        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        {message && <p className="mt-3 text-sm text-emerald-400">{message}</p>}

        {data?.linked.length ? (
          <ul className="mt-4 space-y-3">
            {data.linked.map((row) => (
              <li
                key={row.providerId}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/80 bg-background/50 px-3 py-3"
              >
                <div>
                  <p className="font-medium text-foreground">{row.displayName}</p>
                  <p className="text-xs text-muted">Provider id: {row.providerId}</p>
                  {row.idpGroups.length > 0 && (
                    <p className="mt-1 text-xs text-muted">
                      Groups at last sign-in: {row.idpGroups.join(', ')}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={busy === row.providerId}
                  onClick={() => void handleUnlink(row.providerId)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:bg-elevated hover:text-foreground disabled:opacity-50"
                >
                  <Unlink className="size-3.5" />
                  Unlink
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">No identity providers linked yet.</p>
        )}

        {data?.linkable.length ? (
          <div className="mt-4 space-y-2">
            <FieldLabel>Link a provider</FieldLabel>
            {data.linkable.map((provider) => (
              <button
                key={provider.id}
                type="button"
                className="block w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
                onClick={() => {
                  window.location.assign(
                    federatedSignInUrl(provider.id, {
                      mode: 'link',
                      returnTo: '/settings?tab=account',
                    }),
                  );
                }}
              >
                Link {provider.displayName}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {!passwordEnabled && (
        <form
          onSubmit={handleAddPassword}
          className="rounded-xl border border-primary/25 bg-surface/90 p-4"
        >
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted">
            Add password sign-in
          </h2>
          <div className="space-y-3">
            <label className="block">
              <FieldLabel>New password</FieldLabel>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={controlClasses}
              />
            </label>
            <label className="block">
              <FieldLabel>Confirm password</FieldLabel>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={controlClasses}
              />
            </label>
            <button
              type="submit"
              disabled={busy === 'password-add'}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background hover:bg-primary-hover disabled:opacity-50"
            >
              {busy === 'password-add' ? 'Saving…' : 'Set password'}
            </button>
          </div>
        </form>
      )}

      {passwordEnabled && (data?.linked.length ?? 0) > 0 && (
        <div className="rounded-xl border border-border bg-surface/90 p-4">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
            Password-only sign-in
          </h2>
          <p className="mb-3 text-sm text-muted">
            Remove local password sign-in if you rely entirely on your organization identity
            provider.
          </p>
          <button
            type="button"
            disabled={busy === 'password-remove'}
            onClick={() => void handleRemovePassword()}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:bg-elevated hover:text-foreground disabled:opacity-50"
          >
            {busy === 'password-remove' ? 'Removing…' : 'Remove password sign-in'}
          </button>
        </div>
      )}
    </div>
  );
}
