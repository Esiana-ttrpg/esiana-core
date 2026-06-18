import { normalizeProductVersion } from '@shared/productVersion';

export function formatProductVersionLabel(version: string): string {
  return `v${normalizeProductVersion(version)}`;
}

export function adminVersionFooterClass(isUpdateAvailable: boolean): string {
  return isUpdateAvailable
    ? 'mb-4 rounded-lg border border-primary/40 bg-surface/40 px-3 py-2.5 ring-1 ring-primary/40 shadow-lg shadow-primary/20'
    : 'mb-4 rounded-lg border border-border/80 bg-surface/40 px-3 py-2.5';
}
