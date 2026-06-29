import { useOptionalAdventureWorkspace } from '@/contexts/AdventureWorkspaceContext';
import { PlayerPerspectiveToggle } from '@/components/layout/PlayerPerspectiveToggle';

export function AdventurePlayerPreviewToggle({ className = '' }: { className?: string }) {
  const workspace = useOptionalAdventureWorkspace();

  if (!workspace?.active || !workspace.isDMUser) {
    return null;
  }

  const { playerPreview, setPlayerPreview } = workspace;

  return (
    <PlayerPerspectiveToggle
      className={className}
      value={playerPreview ? 'party' : 'dm'}
      onChange={(next) => setPlayerPreview(next === 'party')}
      ariaLabel="Adventure view perspective"
    />
  );
}
