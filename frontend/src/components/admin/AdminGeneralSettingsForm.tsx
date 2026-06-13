import { FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, Bell, Mail, Upload, UserCog } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { fetchAdminSettings, sendAdminSmtpTestEmail, updateAdminSettings } from '@/lib/adminSettings';
import type { BannerDuration, SystemSettings } from '@/types/admin';
import {
  AdminSectionCard,
  FieldLabel,
  ToggleRow,
} from '@/components/admin/AdminSectionCard';
import { controlClasses, textareaClasses } from '@/components/admin/adminFormStyles';
import { TimezoneSelect } from '@/components/ui/TimezoneSelect';

export function AdminGeneralSettingsForm() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [allowRegistrations, setAllowRegistrations] = useState(true);
  const [allowedDomains, setAllowedDomains] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpFromAddress, setSmtpFromAddress] = useState('');
  const [pollIntervalSeconds, setPollIntervalSeconds] = useState('60');
  const [defaultTimezone, setDefaultTimezone] = useState('UTC');
  const [smtpTestMessage, setSmtpTestMessage] = useState<string | null>(null);
  const [smtpTestError, setSmtpTestError] = useState<string | null>(null);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [relationsMaxVisibleNodes, setRelationsMaxVisibleNodes] = useState('');
  const [relationsMaxVisibleEdges, setRelationsMaxVisibleEdges] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [systemBannerText, setSystemBannerText] = useState('');
  const [bannerDuration, setBannerDuration] = useState<BannerDuration>('3h');
  const [bannerExpiresAt, setBannerExpiresAt] = useState('');
  const [bannerSnapshot, setBannerSnapshot] = useState({
    text: '',
    duration: '3h' as BannerDuration,
    expiresLocal: '',
  });

  function toDatetimeLocalValue(iso: string | null): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function defaultCustomExpiresLocal(): string {
    const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return toDatetimeLocalValue(date.toISOString());
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    fetchAdminSettings()
      .then((row) => {
        if (cancelled) return;
        applySettings(row);
        setSettings(row);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : 'Unable to load system settings.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function applySettings(row: SystemSettings) {
    setAllowRegistrations(row.registration.allowRegistrations);
    setAllowedDomains(row.registration.allowedDomains);
    setSmtpHost(row.smtp.host);
    setSmtpPort(String(row.smtp.port));
    setSmtpUser(row.smtp.user);
    setSmtpPassword(row.smtp.password);
    setSmtpSecure(row.smtp.secure);
    setSmtpFromAddress(row.smtp.fromAddress);
    setPollIntervalSeconds(String(row.notifications?.pollIntervalSeconds ?? 60));
    setDefaultTimezone(row.notifications?.defaultTimezone ?? 'UTC');
    setRelationsMaxVisibleNodes(
      row.relations?.maxVisibleNodes != null ? String(row.relations.maxVisibleNodes) : '',
    );
    setRelationsMaxVisibleEdges(
      row.relations?.maxVisibleEdges != null ? String(row.relations.maxVisibleEdges) : '',
    );
    setMaintenanceMode(row.status.maintenanceMode);
    const bannerText = row.status.systemBannerText;
    const expiresIso = row.status.systemBannerExpiresAt;
    let duration: BannerDuration = '3h';
    let expiresLocal = defaultCustomExpiresLocal();

    setSystemBannerText(bannerText);
    if (!bannerText.trim()) {
      duration = '3h';
    } else if (expiresIso) {
      duration = 'custom';
      expiresLocal = toDatetimeLocalValue(expiresIso);
    }

    setBannerDuration(duration);
    setBannerExpiresAt(expiresLocal);
    setBannerSnapshot({ text: bannerText, duration, expiresLocal });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    const parsedPollInterval = Number.parseInt(pollIntervalSeconds, 10);
    if (!Number.isInteger(parsedPollInterval) || parsedPollInterval < 30 || parsedPollInterval > 300) {
      setSaveError('Notification poll interval must be between 30 and 300 seconds.');
      setSaving(false);
      return;
    }

    const parsedSmtpPort = Number.parseInt(smtpPort, 10);
    if (!Number.isInteger(parsedSmtpPort) || parsedSmtpPort < 1) {
      setSaveError('SMTP port must be a positive whole number.');
      setSaving(false);
      return;
    }

    const trimmedBanner = systemBannerText.trim();
    let resolvedDuration: BannerDuration = bannerDuration;
    if (!trimmedBanner || resolvedDuration === 'clear') {
      resolvedDuration = 'clear';
    } else if (resolvedDuration === 'custom' && !bannerExpiresAt.trim()) {
      setSaveError('Choose an expiration date and time for a custom banner duration.');
      setSaving(false);
      return;
    }

    const bannerChanged =
      trimmedBanner !== bannerSnapshot.text.trim() ||
      resolvedDuration !== bannerSnapshot.duration ||
      (resolvedDuration === 'custom' &&
        bannerExpiresAt !== bannerSnapshot.expiresLocal);

    const trimmedRelationsNodes = relationsMaxVisibleNodes.trim();
    let parsedRelationsNodes: number | null = null;
    if (trimmedRelationsNodes) {
      parsedRelationsNodes = Number.parseInt(trimmedRelationsNodes, 10);
      if (
        !Number.isInteger(parsedRelationsNodes) ||
        parsedRelationsNodes < 20 ||
        parsedRelationsNodes > 100
      ) {
        setSaveError('Relations max visible nodes must be between 20 and 100, or blank for default.');
        setSaving(false);
        return;
      }
    }
    const trimmedRelationsEdges = relationsMaxVisibleEdges.trim();
    let parsedRelationsEdges: number | null = null;
    if (trimmedRelationsEdges) {
      parsedRelationsEdges = Number.parseInt(trimmedRelationsEdges, 10);
      if (
        !Number.isInteger(parsedRelationsEdges) ||
        parsedRelationsEdges < 40 ||
        parsedRelationsEdges > 200
      ) {
        setSaveError('Relations max visible edges must be between 40 and 200, or blank for default.');
        setSaving(false);
        return;
      }
    }

    try {
      const updated = await updateAdminSettings({
        registration: { allowRegistrations, allowedDomains },
        smtp: {
          host: smtpHost,
          port: parsedSmtpPort,
          user: smtpUser,
          password: smtpPassword,
          secure: smtpSecure,
          fromAddress: smtpFromAddress,
        },
        notifications: {
          pollIntervalSeconds: parsedPollInterval,
          defaultTimezone: defaultTimezone.trim() || 'UTC',
        },
        relations: {
          maxVisibleNodes: parsedRelationsNodes,
          maxVisibleEdges: parsedRelationsEdges,
        },
        status: {
          maintenanceMode,
          ...(bannerChanged
            ? {
                systemBannerText: trimmedBanner,
                bannerDuration: resolvedDuration,
                ...(resolvedDuration === 'custom'
                  ? { bannerExpiresAt: new Date(bannerExpiresAt).toISOString() }
                  : {}),
              }
            : {}),
        },
      });
      applySettings(updated);
      setSettings(updated);
      setSaveMessage('General settings saved.');
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Unable to save system settings.',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner label="Loading general settings…" />;
  }

  if (loadError) {
    return (
      <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
        {loadError}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 1. System Status Alerts */}
      <AdminSectionCard
        title="System Status Alerts"
        description="Broadcast maintenance state and a global announcement ribbon to all users."
        icon={AlertTriangle}
      >
        <div className="space-y-4">
          <ToggleRow
            label="Maintenance mode"
            checked={maintenanceMode}
            onChange={setMaintenanceMode}
          />
          <div>
            <FieldLabel>Announcement banner</FieldLabel>
            <textarea
              value={systemBannerText}
              onChange={(e) => setSystemBannerText(e.target.value)}
              rows={3}
              placeholder="Leave empty to clear the global announcement ribbon."
              className={textareaClasses}
            />
          </div>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-foreground">
              Banner visibility duration
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['clear', 'Clear banner'],
                  ['1h', '1 hour'],
                  ['3h', '3 hours'],
                  ['custom', 'Custom expiration'],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm text-foreground hover:border-border"
                >
                  <input
                    type="radio"
                    name="bannerDuration"
                    value={value}
                    checked={bannerDuration === value}
                    onChange={() => {
                      setBannerDuration(value);
                      if (value === 'custom' && !bannerExpiresAt) {
                        setBannerExpiresAt(defaultCustomExpiresLocal());
                      }
                    }}
                    className="border-border bg-elevated text-primary0 focus:ring-primary/40"
                  />
                  {label}
                </label>
              ))}
            </div>
            {bannerDuration === 'custom' && (
              <div>
                <FieldLabel>Expires at</FieldLabel>
                <input
                  type="datetime-local"
                  value={bannerExpiresAt}
                  onChange={(e) => setBannerExpiresAt(e.target.value)}
                  className={controlClasses}
                />
                <p className="mt-1 text-xs text-muted">
                  Uses your browser&apos;s local timezone.
                </p>
              </div>
            )}
            {settings?.status.systemBannerExpiresAt && systemBannerText.trim() && (
              <p className="text-xs text-muted">
                Current expiration:{' '}
                {new Date(settings.status.systemBannerExpiresAt).toLocaleString()}
              </p>
            )}
          </fieldset>
        </div>
      </AdminSectionCard>

      {/* 2. User Gatekeeping */}
      <AdminSectionCard
        title="User Gatekeeping"
        description="Control who can create new accounts on this instance."
        icon={UserCog}
      >
        <div className="space-y-4">
          <ToggleRow
            label="Allow public registrations"
            checked={allowRegistrations}
            onChange={setAllowRegistrations}
            description="When disabled, only the first bootstrap account can still be created on an empty database."
          />
          <div>
            <FieldLabel>Allowed email domains</FieldLabel>
            <textarea
              value={allowedDomains}
              onChange={(e) => setAllowedDomains(e.target.value)}
              rows={3}
              placeholder="example.com, guild.org"
              className={textareaClasses}
            />
          </div>
        </div>
      </AdminSectionCard>

      {/* 3. Communication Channels */}
      <AdminSectionCard
        title="Communication Channels"
        description="Outbound SMTP relay for platform notifications and system mail."
        icon={Mail}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldLabel>SMTP host</FieldLabel>
            <input
              type="text"
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              className={controlClasses}
            />
          </div>
          <div>
            <FieldLabel>Port</FieldLabel>
            <input
              type="number"
              min={1}
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              className={controlClasses}
            />
          </div>
          <div className="flex items-end">
            <ToggleRow
              label="Use TLS / SSL"
              checked={smtpSecure}
              onChange={setSmtpSecure}
            />
          </div>
          <div>
            <FieldLabel>Username</FieldLabel>
            <input
              type="text"
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              autoComplete="off"
              className={controlClasses}
            />
          </div>
          <div>
            <FieldLabel>Password</FieldLabel>
            <input
              type="password"
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              autoComplete="new-password"
              className={controlClasses}
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>From address</FieldLabel>
            <input
              type="email"
              value={smtpFromAddress}
              onChange={(e) => setSmtpFromAddress(e.target.value)}
              className={controlClasses}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={smtpTesting}
            onClick={() => {
              setSmtpTesting(true);
              setSmtpTestMessage(null);
              setSmtpTestError(null);
              void sendAdminSmtpTestEmail()
                .then((result) =>
                  setSmtpTestMessage(`Test email sent to ${result.to}.`),
                )
                .catch((err) =>
                  setSmtpTestError(
                    err instanceof Error ? err.message : 'Test email failed.',
                  ),
                )
                .finally(() => setSmtpTesting(false));
            }}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-elevated disabled:opacity-50"
          >
            {smtpTesting ? 'Sending test…' : 'Send test email to me'}
          </button>
          {smtpTestMessage ? (
            <span className="text-sm text-primary">{smtpTestMessage}</span>
          ) : null}
          {smtpTestError ? (
            <span className="text-sm text-red-500">{smtpTestError}</span>
          ) : null}
        </div>
      </AdminSectionCard>

      <AdminSectionCard
        title="Notifications"
        description="Global in-app notification bell polling interval and default timezone for users who have not set their own."
        icon={Bell}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Poll interval (seconds)</FieldLabel>
            <input
              type="number"
              min={30}
              max={300}
              value={pollIntervalSeconds}
              onChange={(e) => setPollIntervalSeconds(e.target.value)}
              className={controlClasses}
            />
            <p className="mt-1 text-xs text-muted">Allowed range: 30–300. Default is 60.</p>
          </div>
          <div>
            <FieldLabel>Default timezone</FieldLabel>
            <TimezoneSelect
              id="admin-default-timezone"
              value={defaultTimezone}
              onChange={setDefaultTimezone}
            />
            <p className="mt-1 text-xs text-muted">
              IANA timezone used when a user has not chosen their own.
            </p>
          </div>
        </div>
      </AdminSectionCard>

      {/* Upload settings moved to Assets & Uploads */}

      <AdminSectionCard
        title="Relations Render Guardrails"
        description="Safety limits for Relations workspace renderers. Caps bound layout cost; users expand scope via progressive disclosure, not by raising these limits."
        icon={Upload}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Max visible nodes (default 50)</FieldLabel>
            <input
              type="number"
              min={20}
              max={100}
              value={relationsMaxVisibleNodes}
              onChange={(e) => setRelationsMaxVisibleNodes(e.target.value)}
              placeholder="50"
              className={controlClasses}
            />
          </div>
          <div>
            <FieldLabel>Max visible edges (default 80)</FieldLabel>
            <input
              type="number"
              min={40}
              max={200}
              value={relationsMaxVisibleEdges}
              onChange={(e) => setRelationsMaxVisibleEdges(e.target.value)}
              placeholder="80"
              className={controlClasses}
            />
          </div>
        </div>
      </AdminSectionCard>

      {saveError && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {saveError}
        </p>
      )}
      {saveMessage && (
        <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
          {saveMessage}
        </p>
      )}

      <div className="flex justify-end border-t border-border pt-4">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-background hover:bg-primary-hover disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving…' : 'Save general settings'}
        </button>
      </div>

      {settings?.updatedAt && (
        <p className="text-center text-xs text-muted">
          Last updated {new Date(settings.updatedAt).toLocaleString()}
        </p>
      )}
    </form>
  );
}
