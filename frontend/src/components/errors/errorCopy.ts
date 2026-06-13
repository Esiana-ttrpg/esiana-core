export const BLAHAJ_SOURCE_URL = 'https://github.com/GeopJr/BLAHAJ';

const DEFAULT_TITLES: Record<number, string> = {
  403: 'Blåhaj says no.',
  404: 'Page not found',
  500: 'Something went wrong',
};

export function resolveErrorTitle(code?: number, title?: string): string {
  if (title) return title;
  if (code != null && DEFAULT_TITLES[code]) return DEFAULT_TITLES[code]!;
  return 'Something went wrong';
}
