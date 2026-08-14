import type { ReactNode } from 'react';
import { META_SECTION_LABEL_CLASS, TYPE_PROSE_CLASS } from '@/lib/surfaceLayout';

export interface EntityPageSectionProps {
  id: string;
  title: string;
  children: ReactNode;
  /** Description section: dominant prose measure, lighter chrome */
  dominant?: boolean;
  /** Flat encyclopedia-style facts (no card chrome) */
  wikiFacts?: boolean;
  className?: string;
}

export function EntityPageSection({
  id,
  title,
  children,
  dominant = false,
  wikiFacts = false,
  className = '',
}: EntityPageSectionProps) {
  if (dominant) {
    return (
      <section id={id} aria-labelledby={`${id}-heading`} className={`space-y-2 pt-1 ${className}`}>
        <h2 id={`${id}-heading`} className={META_SECTION_LABEL_CLASS}>
          {title}
        </h2>
        <div className={`${TYPE_PROSE_CLASS} max-w-[var(--text-measure-ch,68ch)]`}>{children}</div>
      </section>
    );
  }

  if (wikiFacts) {
    return (
      <section
        id={id}
        aria-labelledby={`${id}-heading`}
        className={`mt-1 pt-5 ${className}`}
      >
        <h2 id={`${id}-heading`} className={`${META_SECTION_LABEL_CLASS} mb-2`}>
          {title}
        </h2>
        {children}
      </section>
    );
  }

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={`rounded-lg border border-border/60 bg-surface/40 p-4 ${className}`}
    >
      <h2 id={`${id}-heading`} className={`${META_SECTION_LABEL_CLASS} mb-3`}>
        {title}
      </h2>
      {children}
    </section>
  );
}
