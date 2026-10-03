import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface ArtworkPreviewProps {
  open: boolean;
  onClose: () => void;
  src: string;
  alt: string;
}

/** Minimal centered artwork lightbox — not a general image-viewer framework. */
export function ArtworkPreview({ open, onClose, src, alt }: ArtworkPreviewProps) {
  const titleId = useId();
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 p-4 sm:p-8"
      onClick={onClose}
    >
      <h2 id={titleId} className="sr-only">
        {alt}
      </h2>
      <img
        src={src}
        alt={alt}
        className="max-h-full max-w-full object-contain shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        draggable={false}
      />
    </div>,
    document.body,
  );
}
