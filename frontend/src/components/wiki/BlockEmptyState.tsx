import type { LucideIcon } from 'lucide-react';

interface BlockEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function BlockEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: BlockEmptyStateProps) {
  return (
    <div
      className={`rounded-lg border border-dashed border-border/80 bg-surface/30 text-center ${
        compact ? 'px-3 py-4' : 'px-4 py-6'
      }`}
    >
      {Icon ? (
        <Icon
          className={`mx-auto text-muted ${compact ? 'mb-1.5 size-5' : 'mb-2 size-6'}`}
          aria-hidden
        />
      ) : null}
      <p className={`font-medium text-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
        {title}
      </p>
      {description ? (
        <p className={`mt-1 text-muted ${compact ? 'text-[11px]' : 'text-xs'}`}>
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/50"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
