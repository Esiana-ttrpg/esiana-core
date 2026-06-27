import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Key, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  createUserApiToken,
  fetchUserApiTokens,
  revokeUserApiToken,
} from '@/lib/user';
import type { ApiTokenDurationDays, UserApiTokenSummary } from '@/types/apiToken';
import { controlClasses } from '@/components/ui/formStyles';

const DURATION_OPTIONS: Array<{ value: ApiTokenDurationDays; label: string }> = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '365 days' },
];

function formatExpiry(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function DeveloperApiKeysSection() {
  const [tokens, setTokens] = useState<UserApiTokenSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tokenName, setTokenName] = useState('');
  const [durationDays, setDurationDays] = useState<ApiTokenDurationDays>(90);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [mintedSecret, setMintedSecret] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadTokens = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await fetchUserApiTokens();
      setTokens(list);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Failed to load API tokens.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTokens();
  }, [loadTokens]);

  async function handleCreateToken(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setMintedSecret(null);
    setCreating(true);

    try {
      const result = await createUserApiToken({
        name: tokenName.trim(),
        durationDays,
      });
      setMintedSecret(result.secret);
      setTokenName('');
      await loadTokens();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Unable to create API token.',
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(tokenId: string) {
    setRevokingId(tokenId);
    setCreateError(null);
    try {
      await revokeUserApiToken(tokenId);
      if (mintedSecret) setMintedSecret(null);
      await loadTokens();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Unable to revoke API token.',
      );
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface/80 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Key className="size-5 text-primary/90" />
        <h2 className={META_SECTION_LABEL_CLASS}>
          Developer API Keys
        </h2>
      </div>

      <p className="mb-4 text-xs text-muted">
        Generate bearer tokens for programmatic access to campaigns you belong to.
      </p>

      <form className="space-y-3" onSubmit={handleCreateToken}>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted">Token Name</span>
          <input
            type="text"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            maxLength={80}
            required
            placeholder="e.g. CI deploy, Foundry sync"
            className={controlClasses}
          />
        </label>

        <fieldset>
          <legend className="mb-2 text-xs font-medium text-muted">Lifetime</legend>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  durationDays === option.value
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-border bg-background text-muted hover:border-border'
                }`}
              >
                <input
                  type="radio"
                  name="token-duration"
                  value={option.value}
                  checked={durationDays === option.value}
                  onChange={() => setDurationDays(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        {createError && <p className="text-sm text-red-300">{createError}</p>}

        <button
          type="submit"
          disabled={creating || !tokenName.trim()}
          className="w-full rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
        >
          {creating ? 'Generating…' : 'Generate API Key'}
        </button>
      </form>

      {mintedSecret && (
        <div className="mt-4 rounded-lg border border-primary/40 bg-primary/10/30 p-4">
          <div className="mb-2 flex items-start gap-2 text-primary">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p className="text-xs leading-relaxed">
              Copy this token now. It will not be shown to you again for security
              purposes.
            </p>
          </div>
          <code className="block break-all rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground">
            {mintedSecret}
          </code>
        </div>
      )}

      <div className="mt-6">
        <h3 className={`mb-2 ${META_SECTION_LABEL_CLASS}`}>
          Active keys
        </h3>

        {loading ? (
          <LoadingSpinner label="Loading API keys…" />
        ) : loadError ? (
          <p className="text-sm text-red-300">{loadError}</p>
        ) : tokens.length === 0 ? (
          <p className="text-sm text-muted">No API keys yet.</p>
        ) : (
          <ul className="space-y-2">
            {tokens.map((token) => (
              <li
                key={token.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {token.name}
                  </p>
                  <p className="text-xs text-muted">
                    Expires {formatExpiry(token.expiresAt)}
                    {token.expired ? ' · expired' : ''}
                    {token.isLegacy ? ' · full access (legacy — rotate to scoped token)' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(token.id)}
                  disabled={revokingId === token.id}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted hover:border-red-800 hover:bg-red-950/40 hover:text-red-300 disabled:opacity-50"
                  title="Revoke token"
                >
                  <Trash2 className="size-3.5" />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
