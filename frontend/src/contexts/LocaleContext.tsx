import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { I18nextProvider } from 'react-i18next';
import {
  isShippedUiLocale,
  resolveEffectiveUiLocale,
} from '@shared/uiLocale';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserProfile } from '@/lib/user';
import { fetchPublicSystemStatus } from '@/lib/publicSystem';
import { applyUiLanguage, getActiveUiLanguage, i18n, initI18n } from '@/i18n/initI18n';

initI18n();

interface LocaleContextValue {
  language: string;
  instanceDefaultLocale: string | null;
  applyLanguage: (languageTag: string) => Promise<void>;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [language, setLanguage] = useState(() => getActiveUiLanguage());
  const [instanceDefaultLocale, setInstanceDefaultLocale] = useState<string | null>(
    null,
  );

  const applyLanguage = useCallback(async (languageTag: string) => {
    const resolved = isShippedUiLocale(languageTag) ? languageTag : 'en';
    await applyUiLanguage(resolved);
    setLanguage(getActiveUiLanguage());
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let userUiLocale: string | null = null;
      let instanceDefaultLocale: string | null = null;

      const [profileResult, systemResult] = await Promise.allSettled([
        isAuthenticated ? fetchUserProfile() : Promise.resolve(null),
        fetchPublicSystemStatus(),
      ]);

      if (profileResult.status === 'fulfilled' && profileResult.value) {
        userUiLocale = profileResult.value.uiLocale ?? null;
      }
      if (systemResult.status === 'fulfilled') {
        instanceDefaultLocale = systemResult.value.defaultUiLocale ?? null;
        setInstanceDefaultLocale(instanceDefaultLocale);
      }

      if (cancelled) return;

      const resolved = resolveEffectiveUiLocale({
        userUiLocale,
        instanceDefaultLocale,
        browserLanguage:
          typeof navigator !== 'undefined' ? navigator.language : null,
      });
      const languageTag = isShippedUiLocale(resolved) ? resolved : 'en';
      await applyLanguage(languageTag);
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, applyLanguage]);

  const value = useMemo(
    () => ({ language, instanceDefaultLocale, applyLanguage }),
    [language, instanceDefaultLocale, applyLanguage],
  );

  return (
    <LocaleContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return ctx;
}
