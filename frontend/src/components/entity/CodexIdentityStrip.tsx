import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import type { ReactNode } from 'react';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

export interface CodexIdentityChip {
  label: string;
  href?: string;
}

export interface CodexIdentityStripProps {
  portraitUrl?: string | null;
  title: string;
  titleSuffix?: ReactNode;
  subtitle?: string | null;
  chips?: CodexIdentityChip[];
  /** Labels hidden behind a +N expand control when chip row exceeds maxVisible. */
  overflowChipLabels?: string[];
  knownFor?: string | null;
  showKnownFor?: boolean;
  projectionType: SurfaceProfileKey;
  compact?: boolean;
  isDMUser?: boolean;
  onEditField?: (fieldKey: string) => void;
  editFieldKey?: string;
  adornment?: ReactNode;
  surfaceClassName?: string;
  ariaLabel?: string;
}

function IdentitySegment({ label, href }: CodexIdentityChip) {
  if (href) {
    return (
      <Link to={href} className="text-primary hover:underline">
        {label}
      </Link>
    );
  }
  return <span>{label}</span>;
}

export function CodexIdentityStrip({
  portraitUrl,
  title,
  titleSuffix,
  subtitle,
  chips = [],
  overflowChipLabels = [],
  knownFor,
  showKnownFor = true,
  compact = false,
  isDMUser: isDMUserProp = false,
  onEditField,
  editFieldKey = 'title',
  adornment,
  surfaceClassName = '',
  ariaLabel,
}: CodexIdentityStripProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const maxVisible = 4;
  const visibleChips = chips.slice(0, maxVisible);
  const hiddenFromChips = chips.slice(maxVisible).map((chip) => chip.label);
  const overflowLabels = [...hiddenFromChips, ...overflowChipLabels];

  return (
    <div
      className={`flex gap-3 ${surfaceClassName} ${compact ? 'text-sm' : ''}`}
      aria-label={ariaLabel ?? title}
    >
      {portraitUrl ? (
        <img
          src={portraitUrl}
          alt=""
          className={`shrink-0 rounded-lg border border-border object-cover ${
            compact ? 'size-10' : 'size-16'
          }`}
        />
      ) : null}

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            className={`font-semibold tracking-tight text-foreground ${
              compact ? 'text-sm' : 'text-lg'
            }`}
          >
            {title}
            {titleSuffix}
          </h2>
          {adornment}
          {isDMUser && onEditField ? (
            <button
              type="button"
              onClick={() => onEditField(editFieldKey)}
              className="rounded p-0.5 text-muted hover:text-primary"
              aria-label="Edit identity"
            >
              <Pencil className="size-3.5" />
            </button>
          ) : null}
        </div>

        {subtitle ? (
          <p className={`text-muted ${compact ? 'text-xs' : 'text-sm'}`}>{subtitle}</p>
        ) : null}

        {visibleChips.length > 0 || overflowLabels.length > 0 ? (
          <p
            className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-muted ${
              compact ? 'text-xs' : 'text-sm'
            }`}
          >
            {visibleChips.map((chip, idx) => (
              <span key={`${chip.label}-${idx}`} className="inline-flex items-center gap-1.5">
                {idx > 0 ? <span className="text-muted/50">•</span> : null}
                <IdentitySegment label={chip.label} href={chip.href} />
              </span>
            ))}
            {overflowLabels.length > 0 ? (
              <details className="inline-flex">
                <summary className="cursor-pointer list-none text-primary hover:underline [&::-webkit-details-marker]:hidden">
                  +{overflowLabels.length} more
                </summary>
                <span className="ml-1.5 inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  {overflowLabels.map((label, idx) => (
                    <span key={`${label}-overflow-${idx}`} className="inline-flex items-center gap-1.5">
                      <span className="text-muted/50">•</span>
                      <span>{label}</span>
                    </span>
                  ))}
                </span>
              </details>
            ) : null}
          </p>
        ) : null}

        {showKnownFor && knownFor ? (
          <p className={`italic text-muted ${compact ? 'text-xs' : 'text-sm'}`}>
            {knownFor}
          </p>
        ) : null}
      </div>
    </div>
  );
}
