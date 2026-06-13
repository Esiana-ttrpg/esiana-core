import type { WorkspaceContextStripConfig } from '@/lib/workspaceRail';

interface WorkspaceContextStripProps {
  config: WorkspaceContextStripConfig | null;
}

export function WorkspaceContextStrip({ config }: WorkspaceContextStripProps) {
  if (!config) return null;

  return (
    <div className="workspace-context-strip" role="status" aria-live="polite">
      {config.items}
    </div>
  );
}
