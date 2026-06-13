import type { WorkspaceRailConfig } from '@/lib/workspaceRail';

interface WorkspaceRailProps {
  config: WorkspaceRailConfig | null;
}

export function WorkspaceRail({ config }: WorkspaceRailProps) {
  if (!config) return null;

  return (
    <div
      className={`workspace-rail workspace-rail--${config.variant}`}
      data-rail-variant={config.variant}
    >
      <div className="workspace-rail__start">{config.start}</div>
      {config.end ? <div className="workspace-rail__end">{config.end}</div> : null}
    </div>
  );
}
