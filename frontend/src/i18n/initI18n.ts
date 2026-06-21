import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getEnglishTranslationBundle, loadTranslationBundle } from './localeBundles';

let initialized = false;

export function initI18n(): typeof i18n {
  if (initialized) return i18n;

  void i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: getEnglishTranslationBundle(),
      },
    },
    defaultNS: 'translation',
    ns: ['translation'],
    keySeparator: false,
    nsSeparator: false,
    interpolation: {
      escapeValue: false,
    },
    returnEmptyString: false,
  });

  initialized = true;
  return i18n;
}

export { i18n };

export async function applyUiLanguage(languageTag: string): Promise<void> {
  const bundle =
    languageTag === 'en'
      ? getEnglishTranslationBundle()
      : (await loadTranslationBundle(languageTag)) ?? getEnglishTranslationBundle();

  i18n.addResourceBundle(languageTag, 'translation', bundle, true, true);
  await i18n.changeLanguage(languageTag);
}

export function getActiveUiLanguage(): string {
  return i18n.language || 'en';
}
