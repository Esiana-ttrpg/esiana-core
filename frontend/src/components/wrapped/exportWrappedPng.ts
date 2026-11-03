import { toPng } from 'html-to-image';
import {
  WRAPPED_EXPORT_HEIGHT,
  WRAPPED_EXPORT_WIDTH,
  waitForDocumentFonts,
} from '@/lib/wrappedPngFeasibility';

export async function captureWrappedPng(node: HTMLElement): Promise<Blob> {
  await waitForDocumentFonts();

  // Guard: export tree must not include remote campaign images.
  const images = node.querySelectorAll('img');
  if (images.length > 0) {
    throw new Error('Share-safe export tree must not include images');
  }

  const dataUrl = await toPng(node, {
    width: WRAPPED_EXPORT_WIDTH,
    height: WRAPPED_EXPORT_HEIGHT,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: getComputedStyle(document.documentElement)
      .getPropertyValue('--color-card')
      .trim() || '#111111',
  });

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
      // User cancel should not fall through to download spam.
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
    }
  }

  const href = URL.createObjectURL(input.blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
  return 'downloaded';
}
