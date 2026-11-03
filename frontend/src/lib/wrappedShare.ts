/**
 * Native share helpers for Wrapped final-card image and published link.
 * Image share never publishes. Link share uses the canonical owner URL.
 */

export type ShareLinkResult =
  | { outcome: 'shared' }
  | { outcome: 'copied' }
  | { outcome: 'manual'; url: string };

export async function shareWrappedImageFile(input: {
  blob: Blob;
  year: number;
  title: string;
}): Promise<'shared' | 'downloaded'> {
  const file = new File([input.blob], `esiana-wrapped-${input.year}.png`, {
    type: 'image/png',
  });

  const canShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    (!navigator.canShare || navigator.canShare({ files: [file] }));

  if (canShare) {
    try {
      await navigator.share({
        files: [file],
        title: input.title,
        text: input.title,
      });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
    }
  }

  return downloadWrappedBlob(input.blob, file.name);
}

export async function shareWrappedLink(input: {
  url: string;
  title: string;
}): Promise<ShareLinkResult> {
  const canShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  if (canShare) {
    try {
      await navigator.share({
        title: input.title,
        text: input.title,
        url: input.url,
      });
      return { outcome: 'shared' };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(input.url);
      return { outcome: 'copied' };
    } catch {
      // Fall through to manual URL display.
    }
  }

  // Caller should show a selectable read-only field with the canonical URL.
  return { outcome: 'manual', url: input.url };
}

export function downloadWrappedBlob(blob: Blob, filename: string): 'downloaded' {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  if (typeof link.remove === 'function') link.remove();
  else document.body.removeChild(link);
  URL.revokeObjectURL(href);
  return 'downloaded';
}

export function canonicalWrappedUrl(userId: string, year: number): string {
  const path = `/users/${userId}/wrapped/${year}`;
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}
