interface PlayerPerspectiveToggleProps {
  value: 'dm' | 'party';
  onChange: (value: 'dm' | 'party') => void;
  className?: string;
  dmLabel?: string;
  partyLabel?: string;
  ariaLabel?: string;
}

const segmentClass =
  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors';

export function PlayerPerspectiveToggle({
  value,
  onChange,
  className = '',
  dmLabel = 'DM',
  partyLabel = 'Party',
  ariaLabel = 'View perspective',
}: PlayerPerspectiveToggleProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
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
        onClick={() => onChange('party')}
        className={`${segmentClass} ${
          value === 'party'
            ? 'bg-primary/15 text-primary shadow-sm'
            : 'text-muted hover:text-foreground'
        }`}
      >
        {partyLabel}
      </button>
    </div>
  );
}
