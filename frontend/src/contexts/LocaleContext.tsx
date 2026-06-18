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
import { applyUiLanguage, getActiveUiLanguage, i18n, initI18n } from '@/i18n/initI18n';

initI18n();

interface LocaleContextValue {
  language: string;
  applyLanguage: (languageTag: string) => Promise<void>;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [language, setLanguage] = useState(() => getActiveUiLanguage());

  const applyLanguage = useCallback(async (languageTag: string) => {
    const resolved = isShippedUiLocale(languageTag) ? languageTag : 'en';
    await applyUiLanguage(resolved);
    setLanguage(getActiveUiLanguage());
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let userUiLocale: string | null = null;
      if (isAuthenticated) {
        try {
          const profile = await fetchUserProfile();
          userUiLocale = profile.uiLocale ?? null;
        } catch {
          userUiLocale = null;
        }
      }

      if (cancelled) return;

      const resolved = resolveEffectiveUiLocale({
        userUiLocale,
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
    () => ({ language, applyLanguage }),
    [language, applyLanguage],
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
