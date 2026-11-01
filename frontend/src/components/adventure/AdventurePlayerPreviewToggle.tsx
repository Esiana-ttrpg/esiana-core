import { useOptionalAdventureWorkspace } from '@/contexts/AdventureWorkspaceContext';
import { PlayerPerspectiveToggle } from '@/components/layout/PlayerPerspectiveToggle';

export function AdventurePlayerPreviewToggle({ className = '' }: { className?: string }) {
  const workspace = useOptionalAdventureWorkspace();

  if (!workspace?.active || !workspace.isDMUser) {
    return null;
  }

  const { perspective, setPerspective } = workspace;

  return (
    <PlayerPerspectiveToggle
      className={className}
      value={perspective}
      onChange={setPerspective}
      publicLabel="Public"
      ariaLabel="Adventure view perspective"
    />
  );
}
