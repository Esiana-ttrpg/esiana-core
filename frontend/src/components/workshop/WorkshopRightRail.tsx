import type { ReactNode } from 'react';
import type { WorkshopRailMode } from '@/lib/workspacePersistence';
import { WorkshopRailSwitcher } from './WorkshopRailSwitcher';

interface WorkshopRightRailProps {
  mode: WorkshopRailMode;
  fieldsDisabled?: boolean;
  onModeChange: (mode: WorkshopRailMode) => void;
  guidePanel: ReactNode;
  fieldsPanel: ReactNode;
}

export function WorkshopRightRail({
  mode,
  fieldsDisabled,
  onModeChange,
  guidePanel,
  fieldsPanel,
}: WorkshopRightRailProps) {
  return (
    <aside className="flex h-full min-h-0 w-full max-w-[280px] flex-col border-l border-border/40 pl-3">
      <div className="mb-3 shrink-0">
        <WorkshopRailSwitcher
          mode={mode}
          fieldsDisabled={fieldsDisabled}
          onChange={onModeChange}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {mode === 'guide' ? guidePanel : fieldsPanel}
      </div>
    </aside>
  );
}
