import type { ReactNode } from 'react';

export type PageShellWidth = 'narrow' | 'standard' | 'wide';

const WIDTH_CLASSES: Record<PageShellWidth, string> = {
  /** Auth, danger zones, focused single-purpose forms. */
  narrow: 'mx-auto w-full max-w-3xl',
  /** Settings, editors, account workflows. */
  standard: 'mx-auto w-full max-w-5xl',
  /** Recruitment, directories, public profiles, admin tables. */
  wide: 'w-full max-w-none',
};

/** Showcase pages: wide canvas with a comfortable upper bound on ultrawide. */
export const SHOWCASE_MAX_WIDTH_CLASS = 'mx-auto w-full max-w-[1400px]';

/** @deprecated Use {@link pageShellClasses}('standard') instead. */
export const PAGE_SHELL_STANDARD_CLASSES = WIDTH_CLASSES.standard;

export function pageShellClasses(width: PageShellWidth = 'standard'): string {
  return WIDTH_CLASSES[width];
}

export interface PageShellProps {
  children: ReactNode;
  width?: PageShellWidth;
  className?: string;
}

export function PageShell({ children, width = 'standard', className }: PageShellProps) {
  const classes = [pageShellClasses(width), className].filter(Boolean).join(' ');
  return <div className={classes}>{children}</div>;
}
