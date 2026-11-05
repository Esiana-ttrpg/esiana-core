import { useId } from 'react';

interface PlayerPerspectiveToggleProps {
  value: 'dm' | 'party';
  onChange: (value: 'dm' | 'party') => void;
  className?: string;
  dmLabel?: string;
  partyLabel?: string;
  ariaLabel?: string;
  previewUnavailableReason?: string;
}

const segmentClass =
  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors';

export function PlayerPerspectiveToggle({
  value,
  onChange,
  className = '',
  dmLabel = 'GM',
  partyLabel = 'Party',
  ariaLabel = 'View perspective',
  previewUnavailableReason,
}: PlayerPerspectiveToggleProps) {
  const descriptionId = useId();
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      aria-describedby={value === 'party' ? descriptionId : undefined}
      className={`inline-flex shrink-0 rounded-lg border border-border bg-surface/80 p-0.5 ${className}`}
    >
      <button
        type="button"
        aria-pressed={value === 'dm'}
        onClick={() => onChange('dm')}
        className={`${segmentClass} ${
          value === 'dm'
            ? 'bg-primary/15 text-primary shadow-sm'
            : 'text-muted hover:text-foreground'
        }`}
      >
        {dmLabel}
      </button>
      <button
        type="button"
        aria-pressed={value === 'party'}
        title={previewUnavailableReason ?? 'Shared party content; individual access may differ'}
        disabled={Boolean(previewUnavailableReason)}
        onClick={() => onChange('party')}
        className={`${segmentClass} disabled:cursor-not-allowed disabled:opacity-50 ${
          value === 'party'
            ? 'bg-primary/15 text-primary shadow-sm'
            : 'text-muted hover:text-foreground'
        }`}
      >
        {partyLabel}
      </button>
      {value === 'party' ? <span id={descriptionId} className="sr-only">
        Party preview shows shared content; individual access may differ.
      </span> : null}
    </div>
  );
}
