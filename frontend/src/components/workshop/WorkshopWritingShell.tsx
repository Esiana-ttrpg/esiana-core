import type { ReactNode } from 'react';

interface WorkshopWritingShellProps {
  toolbar: ReactNode;
  tabs: ReactNode;
  outline: ReactNode;
  editor: ReactNode;
  rightRail: ReactNode;
}

export function WorkshopWritingShell({
  toolbar,
  tabs,
  outline,
  editor,
  rightRail,
}: WorkshopWritingShellProps) {
  return (
    <div className="workshop-writing-shell flex min-h-[calc(100vh-8rem)] flex-col gap-2">
      {toolbar}
      {tabs}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[12rem_minmax(0,1fr)_17rem]">
        <div className="hidden min-h-0 overflow-y-auto border-r border-border/30 pr-2 lg:block">
          {outline}
        </div>
        <div className="min-h-0 min-w-0">{editor}</div>
        <div className="hidden min-h-0 lg:block">{rightRail}</div>
      </div>
    </div>
  );
}
