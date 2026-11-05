import { useOptionalAdventureWorkspace } from '@/contexts/AdventureWorkspaceContext';
import { PlayerPerspectiveToggle } from '@/components/layout/PlayerPerspectiveToggle';
import { ADVENTURE_AUDIENCE_PREVIEW_AVAILABLE } from '@/lib/adventurePreview';

export function AdventurePlayerPreviewToggle({ className = '' }: { className?: string }) {
  const workspace = useOptionalAdventureWorkspace();

  if (!workspace?.active || !workspace.isDMUser) {
    return null;
  }

  const { perspective, setPerspective } = workspace;

  return (
    <div className="flex flex-wrap items-center gap-2">
    <PlayerPerspectiveToggle
      className={className}
      value={perspective}
      onChange={setPerspective}
      ariaLabel="Adventure view perspective"
      previewUnavailableReason={ADVENTURE_AUDIENCE_PREVIEW_AVAILABLE ? undefined : 'Audience previews are temporarily unavailable while access checks are verified.'}
    />
    {!ADVENTURE_AUDIENCE_PREVIEW_AVAILABLE ? <span className="text-xs text-muted">Party preview temporarily unavailable.</span> : null}
    </div>
  );
}
