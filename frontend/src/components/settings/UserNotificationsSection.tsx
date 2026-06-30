import { META_FIELD_LABEL_CLASS, META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  fetchNotificationCapabilities,
  fetchNotificationPreferences,
  patchNotificationPreferences,
} from '@/lib/notifications';
import type {
  NotificationChannelPrefs,
  NotificationPreferenceGroup,
  NotificationType,
} from '@/types/notifications';
import { controlClasses } from '@/components/ui/formStyles';
import {
  translateNotificationGroupLabel,
  translateNotificationTypeLabel,
} from '@/i18n/notificationLabels';

export function UserNotificationsSection() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [groups, setGroups] = useState<NotificationPreferenceGroup[]>([]);
  const [channels, setChannels] = useState<
    Partial<Record<NotificationType, NotificationChannelPrefs>>
  >({});
  const [mutedUntil, setMutedUntil] = useState('');
  const [emailAvailable, setEmailAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchNotificationPreferences(), fetchNotificationCapabilities()])
      .then(([prefs, caps]) => {
        if (cancelled) return;
        setGroups(prefs.groups);
        setChannels(prefs.channels);
        setMutedUntil(
          prefs.mutedUntil
            ? new Date(prefs.mutedUntil).toISOString().slice(0, 16)
            : '',
        );
        setEmailAvailable(caps.emailAvailable);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : t('profile.notifications.loadFailed'),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateChannel(
    type: NotificationType,
    field: keyof NotificationChannelPrefs,
    value: boolean,
  ) {
    setChannels((prev) => ({
      ...prev,
      [type]: {
        inApp: field === 'inApp' ? value : (prev[type]?.inApp ?? true),
        email: field === 'email' ? value : (prev[type]?.email ?? false),
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await patchNotificationPreferences({
        channels,
        mutedUntil: mutedUntil ? new Date(mutedUntil).toISOString() : null,
      });
      setMessage(t('profile.notifications.saved'));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('profile.notifications.saveFailed'),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">{t('profile.notifications.preferencesTitle')}</h2>
        </div>
        <p className="mb-4 text-sm text-muted">{t('profile.notifications.preferencesIntro')}</p>

        <label className="mb-6 block">
          <span className={META_FIELD_LABEL_CLASS}>
            {t('profile.notifications.muteUntilLabel')}
          </span>
          <input
            type="datetime-local"
            value={mutedUntil}
            onChange={(event) => setMutedUntil(event.target.value)}
            className={controlClasses}
          />
          <p className="mt-1 text-xs text-muted">{t('profile.notifications.muteUntilHint')}</p>
        </label>

        {groups.map((group) => (
          <div key={group.id} className="mb-6">
            <h3 className="mb-2 text-sm font-semibold">
              {translateNotificationGroupLabel(group.id, group.label)}
            </h3>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-elevated/60 text-left META_SECTION_LABEL_CLASS">
                  <tr>
                    <th className="px-3 py-2">{t('profile.notifications.columnEvent')}</th>
                    <th className="px-3 py-2">{t('profile.notifications.columnInApp')}</th>
                    <th className="px-3 py-2">{t('profile.notifications.columnEmail')}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.types.map((row) => (
                    <tr key={row.type} className="border-t border-border">
                      <td className="px-3 py-2">
                        {translateNotificationTypeLabel(row.type, row.label)}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={channels[row.type]?.inApp ?? row.channels.inApp}
                          onChange={(event) =>
                            updateChannel(row.type, 'inApp', event.target.checked)
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          disabled={!emailAvailable}
                          checked={channels[row.type]?.email ?? row.channels.email}
                          onChange={(event) =>
                            updateChannel(row.type, 'email', event.target.checked)
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {!emailAvailable ? (
          <p className="mb-4 text-xs text-muted">
            {t('profile.notifications.emailDisabledHint')}
          </p>
        ) : null}

        {error ? <p className="mb-3 text-sm text-red-500">{error}</p> : null}
        {message ? <p className="mb-3 text-sm text-primary">{message}</p> : null}

        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? t('common.saving') : t('profile.notifications.savePreferences')}
        </button>
      </div>
    </div>
  );
}
