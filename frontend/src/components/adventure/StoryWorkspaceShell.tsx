import type { ReactNode } from 'react';

interface StoryWorkspaceShellProps {
  toolbar?: ReactNode;
  viewTabs?: ReactNode;
  children: ReactNode;
}

/** Shared layout skeleton for all Story subviews. */
export function StoryWorkspaceShell({
  toolbar,
  viewTabs,
  children,
}: StoryWorkspaceShellProps) {
  return (
    <div className="story-workspace space-y-4">
      {viewTabs ? <div className="story-workspace__views">{viewTabs}</div> : null}
      {toolbar ? <div className="story-workspace__toolbar">{toolbar}</div> : null}
      <div className="story-workspace__content min-h-[480px]">{children}</div>
    </div>
  );
}
