import type { ReactNode } from 'react';
import { TagIcon } from './TagIcon';
import { tagChipStyle } from '@/lib/resolveTagIcon';

interface TagChipProps {
  name: string;
  label: string;
  icon?: string | null;
  iconAssetUrl?: string | null;
  color?: string | null;
  count?: number;
  selected?: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
  className?: string;
}

const baseClass =
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors';

export function TagChip({
  name,
  label,
  icon,
  iconAssetUrl,
  color,
  count,
  selected = false,
  onClick,
  trailing,
  className = '',
}: TagChipProps) {
  const style = tagChipStyle(color);
  const stateClass = selected
    ? 'border-primary/60 bg-primary/15 font-medium text-primary'
    : 'border-border bg-surface/80 text-foreground hover:border-primary/40 hover:bg-surface';

  const content = (
    <>
      <TagIcon name={name} icon={icon} iconAssetUrl={iconAssetUrl} />
      <span>#{label}</span>
      {count !== undefined && (
        <span className="text-xs tabular-nums text-muted">({count})</span>
      )}
      {trailing}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClass} ${stateClass} ${className}`}
        style={style}
        aria-pressed={selected}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={`${baseClass} ${stateClass} ${className}`}
      style={style}
    >
      {content}
    </span>
  );
}
