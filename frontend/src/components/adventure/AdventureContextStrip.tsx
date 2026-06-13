import { useOptionalAdventureWorkspace } from '@/contexts/AdventureWorkspaceContext';

export function AdventureContextStrip() {
  const workspace = useOptionalAdventureWorkspace();

  if (!workspace?.active || !workspace.isDMUser || !workspace.playerPreview) {
    return null;
  }

  return (
    <span className="text-muted-foreground">
      Player preview
      <span className="mx-1.5 opacity-50" aria-hidden>
        •
      </span>
      hidden GM sections
    </span>
  );
}
