import { Star } from 'lucide-react';

interface CampaignPinButtonProps {
  pinned: boolean;
  onToggle: () => void;
  className?: string;
}

export function CampaignPinButton({ pinned, onToggle, className = '' }: CampaignPinButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={`hub-pin-btn inline-flex size-8 items-center justify-center rounded-full border border-border/60 bg-background/70 text-muted opacity-0 transition-all group-hover:opacity-100 ${pinned ? 'hub-pin-btn--pinned !opacity-100' : ''} ${className}`}
      aria-label={pinned ? 'Unpin campaign' : 'Pin campaign'}
      title={pinned ? 'Unpin' : 'Pin to hearth'}
    >
      <Star className={`size-4 ${pinned ? 'fill-current' : ''}`} strokeWidth={1.5} />
    </button>
  );
}
