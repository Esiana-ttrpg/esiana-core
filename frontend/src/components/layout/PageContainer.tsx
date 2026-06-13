import type { ElementType, ReactNode } from 'react';

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Standard spacing for AppLayout pages. The page canvas (`bg-background`) comes from
 * AppLayout; use {@link PagePanel} for raised content areas.
 */
export function PageContainer({ children, className }: PageContainerProps) {
  const classes = ['flex flex-col gap-6', className].filter(Boolean).join(' ');
  return <div className={classes}>{children}</div>;
}

type PagePanelProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
};

/** Raised panel on the page background — uses `bg-surface` theme token. */
export function PagePanel({ children, className, as: Tag = 'section' }: PagePanelProps) {
  const classes = ['rounded-xl border border-border bg-surface shadow-sm', className]
    .filter(Boolean)
    .join(' ');
  return <Tag className={classes}>{children}</Tag>;
}
