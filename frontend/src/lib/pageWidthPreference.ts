export type MasterPageWidth = 'standard' | 'wide';

export const MASTER_PAGE_WIDTH_STORAGE_KEY = 'master-user-page-width';
export const MASTER_PAGE_WIDTH_EVENT = 'master-user-page-width-changed';

export function normalizeMasterPageWidth(value: unknown): MasterPageWidth {
  return value === 'wide' ? 'wide' : 'standard';
}

export function getMasterPageWidthPreference(): MasterPageWidth {
  if (typeof window === 'undefined') return 'standard';
  return normalizeMasterPageWidth(
    window.localStorage.getItem(MASTER_PAGE_WIDTH_STORAGE_KEY),
  );
}

export function setMasterPageWidthPreference(value: MasterPageWidth): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MASTER_PAGE_WIDTH_STORAGE_KEY, value);
  window.dispatchEvent(
    new CustomEvent<MasterPageWidth>(MASTER_PAGE_WIDTH_EVENT, { detail: value }),
  );
}

export function pageWidthContainerClasses(value: MasterPageWidth): string {
  return value === 'wide'
    ? 'max-w-none w-full px-4 sm:px-6 lg:px-12 transition-all duration-200'
    : 'max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 transition-all duration-200';
}
