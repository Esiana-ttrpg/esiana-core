import type { BlockDisplayState } from '@/lib/blockDisplayState';
import { getWorkspaceOrchestration } from '@/lib/workspaceOrchestration';
import type { WorkspaceMode } from '@/lib/surfaceDensityProfile';

interface WikiPageEditStatusHintProps {
  workspaceMode: WorkspaceMode;
  isEditingPage: boolean;
  showGridLines: boolean;
  blockDisplayState: BlockDisplayState;
  className?: string;
}

/** Subtle runtime hint — does not compete with document subview tabs. */
export function WikiPageEditStatusHint({
  workspaceMode,
  isEditingPage,
  showGridLines,
  blockDisplayState,
  className = '',
}: WikiPageEditStatusHintProps) {
  const orchestration = getWorkspaceOrchestration(workspaceMode);
  const parts: string[] = [];

  parts.push(`${orchestration.label} workspace`);
  parts.push(orchestration.tagline);

  if (isEditingPage) {
    parts.push(showGridLines ? 'Layout editing' : 'Editorial editing');
  }

  if (blockDisplayState.scale !== 'compact' && blockDisplayState.activeBlockId) {
    parts.push(
      blockDisplayState.scale === 'focused' ? 'Block in focus' : 'Block expanded',
    );
  }

  return (
    <p
      className={`text-[11px] leading-snug text-muted/75 ${className}`.trim()}
      aria-live="polite"
    >
      {parts.join(' · ')}
    </p>
  );
}
