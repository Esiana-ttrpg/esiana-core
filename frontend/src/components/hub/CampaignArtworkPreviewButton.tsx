import { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { ArtworkPreview } from '@/components/ui/ArtworkPreview';

interface CampaignArtworkPreviewButtonProps {
  src: string;
  alt: string;
  className?: string;
}

/** Hub card control — Lucide Maximize2 matching CampaignPinButton chrome. */
export function CampaignArtworkPreviewButton({
  src,
  alt,
  className = '',
}: CampaignArtworkPreviewButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`hub-pin-btn inline-flex size-8 items-center justify-center rounded-full border border-border/60 bg-background/70 text-muted opacity-0 transition-all group-hover:opacity-100 group-focus-within:opacity-100 ${className}`}
        aria-label="View artwork"
        title="View artwork"
      >
        <Maximize2 className="size-4" strokeWidth={1.5} />
      </button>
      <ArtworkPreview open={open} onClose={() => setOpen(false)} src={src} alt={alt} />
    </>
  );
}
