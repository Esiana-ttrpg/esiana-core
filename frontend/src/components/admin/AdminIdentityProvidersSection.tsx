import { FormEvent, useCallback, useEffect, useState } from 'react';
import { KeyRound, Plus } from 'lucide-react';
import { AdminSectionCard } from '@/components/admin/AdminSectionCard';
import { FieldHint, FieldLabel } from '@/components/settings/settingsFormHelpers';
import { controlClasses, textareaClasses } from '@/components/ui/formStyles';
import {
  deleteAdminIdentityProvider,
  fetchAdminIdentityProviders,
  saveAdminIdentityProvider,
  type AdminIdentityProvider,
} from '@/lib/federatedIdentity';

const TEMPLATES = [
  { id: 'oidc', label: 'Generic OIDC' },
  { id: 'authentik', label: 'Authentik' },
  { id: 'keycloak', label: 'Keycloak' },
  { id: 'azure', label: 'Microsoft Entra ID' },
  { id: 'google', label: 'Google (optional)' },
  { id: 'discord', label: 'Discord (optional)' },
] as const;

type ProviderFormState = {
  id: string;
  template: string;
  enabled: boolean;
  displayName: string;
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
  tenantId: string;
  groupsClaim: string;
  groupRoleMappingsJson: string;
  sortOrder: number;
};

function emptyForm(): ProviderFormState {
  return {
    id: '',
    template: 'oidc',
    enabled: false,
    displayName: '',
    issuerUrl: '',
    clientId: '',
    clientSecret: '',
    scopes: 'openid profile email',
    tenantId: '',
    groupsClaim: 'groups',
    groupRoleMappingsJson: '{}',
    sortOrder: 0,
  };
}

function formFromProvider(row: AdminIdentityProvider): ProviderFormState {
  return {
    id: row.id,
    template: row.template,
    enabled: row.enabled,
    displayName: row.displayName,
    issuerUrl: row.issuerUrl,
    clientId: row.clientId,
    clientSecret: '',
    scopes: row.scopes,
    tenantId: row.tenantId ?? '',
    groupsClaim: row.groupsClaim ?? '',
    groupRoleMappingsJson: JSON.stringify(row.groupRoleMappings ?? {}, null, 2),
    sortOrder: row.sortOrder,
  };
}

export function AdminIdentityProvidersSection() {
  const [providers, setProviders] = useState<AdminIdentityProvider[]>([]);
  const [secretEncryptionConfigured, setSecretEncryptionConfigured] =
    useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<ProviderFormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminIdentityProviders();
      setProviders(data.providers);
      setSecretEncryptionConfigured(data.secretEncryptionConfigured);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load providers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setMessage(null);
    setError(null);
  }

  function startEdit(row: AdminIdentityProvider) {
    setEditingId(row.id);
    setForm(formFromProvider(row));
    setMessage(null);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const id = (editingId ?? form.id).trim().toLowerCase();
    if (!id) {
      setError('Provider id is required');
      return;
    }
    let groupRoleMappings: Record<string, string> = {};
    try {
      const parsed = JSON.parse(form.groupRoleMappingsJson || '{}') as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        groupRoleMappings = parsed as Record<string, string>;
      }
    } catch {
      setError('Group role mappings must be valid JSON');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {
        template: form.template,
        enabled: form.enabled,
        displayName: form.displayName,
        issuerUrl: form.issuerUrl,
        clientId: form.clientId,
        scopes: form.scopes,
        tenantId: form.tenantId || null,
        groupsClaim: form.groupsClaim.trim() ? form.groupsClaim.trim() : null,
        groupRoleMappings,
        sortOrder: form.sortOrder,
      };
      if (form.clientSecret.trim()) {
        body.clientSecret = form.clientSecret.trim();
      }
      await saveAdminIdentityProvider(id, body);
      setMessage(editingId ? 'Provider updated.' : 'Provider created.');
      setEditingId(id);
      setForm((prev) => ({ ...prev, id, clientSecret: '' }));
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save provider');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(`Delete identity provider "${id}"?`)) return;
    setError(null);
    setMessage(null);
    try {
      await deleteAdminIdentityProvider(id);
      if (editingId === id) {
        startCreate();
      }
      setMessage('Provider deleted.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete provider');
    }
  }

  const redirectPreview = form.id
    ? `${window.location.origin}/api/auth/oidc/${encodeURIComponent(form.id)}/callback`
    : '';

  return (
    <AdminSectionCard
      title="External identity providers"
      description="Configure OIDC upstream IdPs (Authentik, Keycloak, Pocket ID, Entra ID). Esiana uses one standard OIDC flow for all providers."
      icon={KeyRound}
    >
      {!secretEncryptionConfigured && (
        <p className="mb-4 rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
          Set AUTH_SECRETS_KEY (32-byte base64) in production to encrypt client secrets. Dev
          mode stores secrets with a dev prefix when unset.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading providers…</p>
      ) : (
        <div className="mb-6 space-y-2">
          {providers.length === 0 ? (
            <p className="text-sm text-muted">No providers configured yet.</p>
          ) : (
            providers.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {row.displayName}{' '}
                    <span className="text-xs text-muted">({row.id})</span>
                  </p>
                  <p className="text-xs text-muted">
                    {row.enabled ? 'Enabled' : 'Disabled'} · {row.template}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => startEdit(row)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-sm text-red-300 hover:underline"
                    onClick={() => void handleDelete(row.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-elevated"
        >
          <Plus className="size-4" />
          Add OIDC provider
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 border-t border-border pt-4">
        <p className="text-sm font-medium text-foreground">
          {editingId ? `Editing ${editingId}` : 'New provider'}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <FieldLabel>Provider id (slug)</FieldLabel>
            <input
              value={form.id}
              disabled={Boolean(editingId)}
              onChange={(e) =>
                setForm((f) => ({ ...f, id: e.target.value.toLowerCase() }))
              }
              placeholder="authentik"
              className={controlClasses}
              required
            />
          </label>
          <label className="block">
            <FieldLabel>Quick setup template</FieldLabel>
            <select
              value={form.template}
              onChange={(e) =>
                setForm((f) => ({ ...f, template: e.target.value }))
              }
              className={controlClasses}
            >
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) =>
              setForm((f) => ({ ...f, enabled: e.target.checked }))
            }
          />
          Enabled for sign-in
        </label>

        <label className="block">
          <FieldLabel>Display name</FieldLabel>
          <input
            value={form.displayName}
            onChange={(e) =>
              setForm((f) => ({ ...f, displayName: e.target.value }))
            }
            className={controlClasses}
            required
          />
        </label>

        <label className="block">
          <FieldLabel>Issuer URL (OIDC discovery)</FieldLabel>
          <input
            value={form.issuerUrl}
            onChange={(e) => setForm((f) => ({ ...f, issuerUrl: e.target.value }))}
            placeholder="https://auth.example.com/application/o/esiana/"
            className={controlClasses}
          />
          <FieldHint>Required for Authentik, Pocket ID, Keycloak, generic OIDC.</FieldHint>
        </label>

        {form.template === 'azure' && (
          <label className="block">
            <FieldLabel>Tenant ID (Azure)</FieldLabel>
            <input
              value={form.tenantId}
              onChange={(e) => setForm((f) => ({ ...f, tenantId: e.target.value }))}
              className={controlClasses}
            />
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <FieldLabel>Client ID</FieldLabel>
            <input
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
              className={controlClasses}
              required
            />
          </label>
          <label className="block">
            <FieldLabel>Client secret</FieldLabel>
            <input
              type="password"
              value={form.clientSecret}
              onChange={(e) =>
                setForm((f) => ({ ...f, clientSecret: e.target.value }))
              }
              placeholder={editingId ? 'Leave blank to keep existing' : ''}
              className={controlClasses}
            />
          </label>
        </div>

        <label className="block">
          <FieldLabel>Scopes</FieldLabel>
          <input
            value={form.scopes}
            onChange={(e) => setForm((f) => ({ ...f, scopes: e.target.value }))}
            className={controlClasses}
          />
        </label>

        <label className="block">
          <FieldLabel>Groups claim</FieldLabel>
          <input
            value={form.groupsClaim}
            onChange={(e) => setForm((f) => ({ ...f, groupsClaim: e.target.value }))}
            placeholder="groups"
            className={controlClasses}
          />
          <FieldHint>
            Claim name for login-time group sync (e.g. groups). Leave empty to disable.
          </FieldHint>
        </label>

        <label className="block">
          <FieldLabel>Group → role mappings (JSON)</FieldLabel>
          <textarea
            value={form.groupRoleMappingsJson}
            onChange={(e) =>
              setForm((f) => ({ ...f, groupRoleMappingsJson: e.target.value }))
            }
            rows={4}
            className={textareaClasses}
          />
          <FieldHint>
            Example: {`{"esiana-admins":"SYSTEM_ADMIN"}`} — promote-only on login.
          </FieldHint>
        </label>

        {redirectPreview && (
          <div className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-muted">
            <span className="font-medium text-foreground">Redirect URI: </span>
            {redirectPreview}
          </div>
        )}

        {error && <p className="text-sm text-red-300">{error}</p>}
        {message && <p className="text-sm text-emerald-400">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create provider'}
        </button>
      </form>
    </AdminSectionCard>
  );
}
