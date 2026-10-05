import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/lib/user';
import { CAMPAIGN_NAVIGATION_SHORTCUTS } from '@/lib/campaignNavigationShortcuts';

interface ShortcutKeycapProps {
  value: string;
  onEdit?: (value: string) => void;
}

export function ShortcutKeycap({ value }: ShortcutKeycapProps) {
  return (
    <kbd className="inline-flex min-w-9 items-center justify-center rounded-md border border-border bg-background px-2 py-1 font-mono text-sm font-semibold uppercase text-foreground shadow-sm">
      {value}
    </kbd>
  );
}

interface UserKeyboardShortcutsSectionProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export function UserKeyboardShortcutsSection({
  enabled,
  onEnabledChange,
}: UserKeyboardShortcutsSectionProps) {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const [checked, setChecked] = useState(enabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setChecked(enabled), [enabled]);

  async function handleEnabledChange(next: boolean) {
    const previous = checked;
    setChecked(next);
    setSaving(true);
    setError(null);
    try {
      await updateUserProfile({ campaignNavigationShortcutsEnabled: next });
      onEnabledChange(next);
      await refresh();
    } catch (err) {
      setChecked(previous);
      setError(
        err instanceof Error ? err.message : t('profile.profile.shortcuts.saveFailed'),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-elevated/40 p-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {t('profile.profile.shortcuts.heading')}
        </h2>
        <p className="mt-1 text-sm text-muted">{t('profile.profile.shortcuts.description')}</p>
      </div>

      <label className="flex items-start gap-3 rounded-md border border-border bg-background px-3 py-3">
        <input
          type="checkbox"
          checked={checked}
          disabled={saving}
          onChange={(event) => void handleEnabledChange(event.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          <span className="block text-sm font-medium text-foreground">
            {t('profile.profile.shortcuts.enable')}
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            {saving ? t('profile.profile.shortcuts.saving') : t('profile.profile.shortcuts.enableHint')}
          </span>
        </span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-border px-4 py-2 text-xs font-medium text-muted">
          <span>{t('profile.profile.shortcuts.destination')}</span>
          <span>{t('profile.profile.shortcuts.shortcut')}</span>
        </div>
        <div className="divide-y divide-border">
          {CAMPAIGN_NAVIGATION_SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.destination}
              className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-2.5"
            >
              <span className="text-sm text-foreground">{t(shortcut.labelKey)}</span>
              <ShortcutKeycap value={shortcut.key} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
