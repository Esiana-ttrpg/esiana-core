import { toPng } from 'html-to-image';
import {
  WRAPPED_EXPORT_HEIGHT,
  WRAPPED_EXPORT_WIDTH,
  waitForDocumentFonts,
} from '@/lib/wrappedPngFeasibility';
import { shareWrappedImageFile } from '@/lib/wrappedShare';

/** Bound toPng so stalled font stylesheet/file work cannot hang export forever. */
const TOPNG_TIMEOUT_MS = 12_000;

async function toPngBounded(node: HTMLElement): Promise<string> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      toPng(node, {
        width: WRAPPED_EXPORT_WIDTH,
        height: WRAPPED_EXPORT_HEIGHT,
        pixelRatio: 1,
        cacheBust: true,
        // Skip remote font embedding — document.fonts.ready is already bounded.
        fontEmbedCSS: '',
        backgroundColor:
          getComputedStyle(document.documentElement)
            .getPropertyValue('--color-card')
            .trim() || '#111111',
      }),
      new Promise<string>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('PNG capture timed out'));
        }, TOPNG_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export async function captureWrappedPng(node: HTMLElement): Promise<Blob> {
  await waitForDocumentFonts();

  // Guard: export tree must not include remote campaign images.
  const images = node.querySelectorAll('img');
  if (images.length > 0) {
    throw new Error('Share-safe export tree must not include images');
  }

  const dataUrl = await toPngBounded(node);
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  if (blob.size <= 0) {
    throw new Error('PNG capture produced an empty blob');
  }
  return blob;
}

export async function shareOrDownloadWrappedPng(input: {
  blob: Blob;
  year: number;
  title: string;
}): Promise<'shared' | 'downloaded'> {
  return shareWrappedImageFile(input);
}
