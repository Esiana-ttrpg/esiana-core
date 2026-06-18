import common from './en/common.json';
import navigationMain from './en/navigation/main.json';
import navigationSidebar from './en/navigation/sidebar.json';
import profileProfile from './en/profile/profile.json';
import profilePreferences from './en/profile/preferences.json';

const ENGLISH_BUNDLE: Record<string, string> = {
  ...common,
  ...navigationMain,
  ...navigationSidebar,
  ...profileProfile,
  ...profilePreferences,
};

export function getEnglishTranslationBundle(): Record<string, string> {
  return ENGLISH_BUNDLE;
}

/** Load a non-English bundle when community locale folders exist. */
export async function loadTranslationBundle(
  languageTag: string,
): Promise<Record<string, string> | null> {
  if (languageTag === 'en') return ENGLISH_BUNDLE;

  const loaders = import.meta.glob<{ default: Record<string, string> }>(
    './*/**/*.json',
    { eager: false },
  );

  const merged: Record<string, string> = { ...ENGLISH_BUNDLE };
  let found = false;

  for (const [path, loadModule] of Object.entries(loaders)) {
    const match = path.match(/^\.\/([^/]+)\/(.+\.json)$/);
    if (!match || match[1] !== languageTag) continue;
    const mod = await loadModule();
    Object.assign(merged, mod.default ?? mod);
    found = true;
  }

  return found ? merged : null;
}

export function expectedKeyPrefix(relativeJsonPath: string): string {
  const normalized = relativeJsonPath.replace(/\\/g, '/');
  const withoutExt = normalized.replace(/\.json$/i, '');
  if (!withoutExt.includes('/')) return withoutExt;
  return withoutExt.replace(/\//g, '.');
}
