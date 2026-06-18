import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SHIPPED_UI_LOCALES, resolveEffectiveUiLocale } from '@shared/uiLocale';
import { useLocale } from '@/contexts/LocaleContext';
import { fetchUserProfile, updateUserProfile } from '@/lib/user';

const LOCALE_LABEL_KEYS: Record<string, string> = {
  en: 'profile.preferences.uiLocaleEnglish',
};

export function UserUiLanguageSection() {
  const { t } = useTranslation();
  const { applyLanguage } = useLocale();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchUserProfile()
      .then((profile) => {
        if (cancelled) return;
        setValue(profile.uiLocale ?? '');
      })
      .catch(() => {
        if (!cancelled) setError(t('profile.preferences.uiLocaleSaveFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleChange = useCallback(
    async (next: string) => {
      setValue(next);
      setMessage(null);
      setError(null);
      setSaving(true);
      try {
        const updated = await updateUserProfile({
          uiLocale: next.trim() || null,
        });
        setValue(updated.uiLocale ?? '');
        await applyLanguage(
          resolveEffectiveUiLocale({
            userUiLocale: updated.uiLocale ?? null,
            browserLanguage:
              typeof navigator !== 'undefined' ? navigator.language : null,
          }),
        );
        setMessage(t('profile.preferences.uiLocaleSaved'));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('profile.preferences.uiLocaleSaveFailed'),
        );
      } finally {
        setSaving(false);
      }
    },
    [applyLanguage, t],
  );

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">
          {t('profile.preferences.uiLocaleLabel')}
        </h2>
        <p className="text-sm text-muted">{t('profile.preferences.uiLocaleHint')}</p>
      </div>

      <div className="mt-4 max-w-md">
        <label htmlFor="user-ui-locale" className="sr-only">
          {t('profile.preferences.uiLocaleLabel')}
        </label>
        <select
          id="user-ui-locale"
          value={value}
          disabled={loading || saving}
          onChange={(event) => void handleChange(event.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="">{t('profile.preferences.uiLocaleAuto')}</option>
          {SHIPPED_UI_LOCALES.map((code) => (
            <option key={code} value={code}>
              {LOCALE_LABEL_KEYS[code] ? t(LOCALE_LABEL_KEYS[code]) : code}
            </option>
          ))}
        </select>
      </div>

      {message ? (
        <p className="mt-3 text-sm text-green-400">{message}</p>
      ) : null}
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}
