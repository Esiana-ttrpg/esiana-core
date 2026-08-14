import type { ReactNode } from 'react';
import { TYPE_META_CLASS } from '@/lib/surfaceLayout';

const EMPTY_PLACEHOLDER = '—';

/** Horizontal wiki infobox row — no per-row dividers */
export function entityFactRowGridClass(_compact = true): string {
  return [
    'grid grid-cols-[minmax(5.5rem,7.75rem)_minmax(0,1fr)]',
    'items-baseline gap-x-3 gap-y-0 py-0.5',
  ].join(' ');
}

export const ENTITY_FACT_LABEL_CLASS = `${TYPE_META_CLASS} text-[11px] leading-snug text-muted`;
export const ENTITY_FACT_VALUE_CLASS =
  'min-w-0 text-sm font-medium leading-snug text-foreground';

/** Edit controls sit in value column — minimal chrome until focused */
export const ENTITY_FACT_EDIT_FIELD_CLASS =
  'w-full rounded-sm border border-transparent bg-transparent px-1 py-0.5 -mx-1 text-sm font-medium text-foreground outline-none focus:border-border/35 focus:bg-surface/25';

export interface EntityFactRowProps {
  label: string;
  fieldId?: string;
  children: ReactNode;
  compact?: boolean;
}

export function EntityFactRow({
  label,
  fieldId,
  children,
  compact = true,
}: EntityFactRowProps) {
  return (
    <div id={fieldId} className={entityFactRowGridClass(compact)}>
      <dt className={ENTITY_FACT_LABEL_CLASS}>{label}</dt>
      <dd className={ENTITY_FACT_VALUE_CLASS}>{children}</dd>
    </div>
  );
}

export function EntityFactReadValue({ value }: { value: string | null | undefined }) {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return (
      <span className="font-normal text-muted/60" aria-hidden>
        {EMPTY_PLACEHOLDER}
      </span>
    );
  }
  return <span>{trimmed}</span>;
}

export function EntityWikiInfobox({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-l-2 border-primary/15 bg-surface/[0.03] py-2 pl-3 pr-1 ${className}`.trim()}
    >
      {children}
    </div>
  );
}

/** Infobox fact list — constrained width, whitespace between rows */
export function EntityFactRowList({
  children,
  className = '',
  dense = true,
}: {
  children: ReactNode;
  className?: string;
  dense?: boolean;
}) {
  return (
    <dl
      className={`m-0 w-full max-w-md space-y-0 ${dense ? 'leading-tight' : ''} ${className}`.trim()}
    >
      {children}
    </dl>
  );
}

export { EMPTY_PLACEHOLDER };
