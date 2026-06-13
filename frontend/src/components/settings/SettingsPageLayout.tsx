import type { ReactNode } from 'react';
import { PageShell } from '@/components/layout/PageShell';

export interface SettingsPageLayoutProps {
  children: ReactNode;
  className?: string;
}

/** Centered workflow column for account settings and related user preference pages. */
export function SettingsPageLayout({ children, className }: SettingsPageLayoutProps) {
  return (
    <PageShell width="standard" className={className}>
      {children}
    </PageShell>
  );
}
