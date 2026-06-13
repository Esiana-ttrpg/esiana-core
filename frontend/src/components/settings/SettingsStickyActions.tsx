import type { ReactNode } from 'react';
import { pageShellClasses } from '@/components/layout/PageShell';

export interface SettingsStickyActionsProps {
  children: ReactNode;
  /** Extra bottom padding on the form when sticky bar is visible (mobile/tablet). */
  className?: string;
}

/**
 * Renders form actions inline on desktop; sticky bottom bar on tablet/mobile.
 */
export function SettingsStickyActions({ children, className = '' }: SettingsStickyActionsProps) {
  return (
    <>
      <div className={`hidden lg:flex lg:flex-wrap lg:items-center lg:gap-3 ${className}`}>
        {children}
      </div>
      <div
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden ${className}`}
      >
        <div className={`flex ${pageShellClasses('standard')} items-center justify-end gap-3`}>
          {children}
        </div>
      </div>
      <div className="h-16 lg:hidden" aria-hidden />
    </>
  );
}
