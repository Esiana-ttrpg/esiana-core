import { Link } from 'react-router-dom';
import type { LedgerTransactionLine } from '@shared/downtimeHub';

function toneClass(tone: LedgerTransactionLine['tone']): string {
  switch (tone) {
    case 'escalation':
      return 'border-amber-500/30 bg-amber-950/20';
    case 'warning':
      return 'border-orange-500/20 bg-orange-950/10';
    default:
      return 'border-border bg-elevated/30';
  }
}

interface LedgerTransactionFeedProps {
  lines: LedgerTransactionLine[];
  emptyMessage?: string;
  onEdit?: (line: LedgerTransactionLine) => void;
  onDelete?: (line: LedgerTransactionLine) => void;
}

export function LedgerTransactionFeed({
  lines,
  emptyMessage,
  onEdit,
  onDelete,
}: LedgerTransactionFeedProps) {
  if (lines.length === 0) {
    return emptyMessage ? (
      <p className="text-sm leading-relaxed text-muted-foreground">{emptyMessage}</p>
    ) : null;
  }

  return (
    <ul className="space-y-3">
      {lines.map((line) => (
        <li
          key={line.id}
          className={`rounded-lg border p-4 ${toneClass(line.tone)}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-baseline gap-2">
                {line.href ? (
                  <Link
                    to={line.href}
                    className="truncate font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {line.title}
                  </Link>
                ) : (
                  <span className="truncate font-medium text-foreground">{line.title}</span>
                )}
                <span className="hidden min-w-0 flex-1 border-b border-dotted border-border/60 sm:inline-block" />
                <span
                  className={`shrink-0 font-medium tabular-nums ${
                    line.amountLabel.startsWith('+')
                      ? 'text-emerald-400'
                      : line.amountLabel.startsWith('-')
                        ? 'text-orange-300'
                        : 'text-foreground'
                  }`}
                >
                  {line.amountLabel}
                </span>
              </div>
              {line.narrative ? (
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {line.narrative}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground/80">
                {line.categoryLabel}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <span className="text-xs text-muted-foreground">{line.dateLabel}</span>
              {(line.canEdit || line.canDelete) && (onEdit || onDelete) ? (
                <div className="flex gap-2">
                  {line.canEdit && onEdit ? (
                    <button
                      type="button"
                      onClick={() => onEdit(line)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Edit
                    </button>
                  ) : null}
                  {line.canDelete && onDelete ? (
                    <button
                      type="button"
                      onClick={() => onDelete(line)}
                      className="text-xs text-muted-foreground hover:text-red-300"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
