import {
  buildAncestryInheritanceProjection,
  type InheritanceMarker,
  type StructuredFieldEntry,
} from '@/lib/ancestryInheritanceProjection';
import type { WikiTreeNode } from '@/types/wiki';

const MARKER_SYMBOL: Record<InheritanceMarker, string> = {
  inherited: '✓',
  modified: '~',
  unique: '+',
};

const MARKER_TONE: Record<InheritanceMarker, string> = {
  inherited: 'text-emerald-600 dark:text-emerald-400',
  modified: 'text-amber-600 dark:text-amber-400',
  unique: 'text-sky-600 dark:text-sky-400',
};

function InheritanceRow({ entry }: { entry: StructuredFieldEntry }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span
        className={`mt-0.5 w-4 shrink-0 text-center font-mono text-xs font-semibold ${MARKER_TONE[entry.marker]}`}
        title={entry.marker}
        aria-hidden
      >
        {MARKER_SYMBOL[entry.marker]}
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-muted">{entry.label}: </span>
        <span className="text-foreground/90">{entry.value}</span>
      </div>
    </div>
  );
}

interface AncestryInheritancePanelProps {
  pageId: string;
  flatPages: WikiTreeNode[];
  className?: string;
  showEffectiveTraits?: boolean;
}

export function AncestryInheritancePanel({
  pageId,
  flatPages,
  className = '',
  showEffectiveTraits = true,
}: AncestryInheritancePanelProps) {
  const projection = buildAncestryInheritanceProjection(pageId, flatPages);
  const entries = [
    ...projection.inherited,
    ...projection.modified,
    ...projection.unique,
  ];

  if (entries.length === 0 && !showEffectiveTraits) {
    return (
      <p className={`text-sm text-muted ${className}`}>
        No inherited traits or structured fields to compare.
      </p>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {entries.length > 0 ? (
        <div className="space-y-1.5 rounded-lg border border-border/60 bg-surface/30 p-3">
          <div className="mb-2 flex flex-wrap gap-3 text-[10px] uppercase tracking-wide text-muted">
            <span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">✓</span> inherited
            </span>
            <span>
              <span className="font-mono text-amber-600 dark:text-amber-400">~</span> modified
            </span>
            <span>
              <span className="font-mono text-sky-600 dark:text-sky-400">+</span> unique
            </span>
          </div>
          {entries.map((entry) => (
            <InheritanceRow key={entry.key} entry={entry} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Root ancestry — traits defined here, not inherited.</p>
      )}

      {showEffectiveTraits && projection.effectiveTraits.length > 0 ? (
        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            Effective traits
          </h4>
          <ul className="flex flex-wrap gap-1.5">
            {projection.effectiveTraits.map((trait) => (
              <li
                key={trait}
                className="rounded-full border border-border/60 bg-surface/50 px-2 py-0.5 text-xs"
              >
                {trait}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
