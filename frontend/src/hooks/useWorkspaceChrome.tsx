import { useMemo } from 'react';
import { AdventureContextStrip } from '@/components/adventure/AdventureContextStrip';
import { useOptionalAdventureWorkspace } from '@/contexts/AdventureWorkspaceContext';
import { useAdventureRoute } from '@/hooks/useAdventureRoute';
import { DowntimeSectionTabs } from '@/components/downtime/DowntimeSectionTabs';
import { ProgressionSectionTabs } from '@/components/progression/ProgressionSectionTabs';
import { useDowntimeRoute } from '@/hooks/useDowntimeRoute';
import { useProgressionRoute } from '@/hooks/useProgressionRoute';
import {
  EMPTY_WORKSPACE_CHROME,
  type WorkspaceChromeConfig,
} from '@/lib/workspaceRail';
import {
  supportsWorkspaceRail,
  type WorkspaceCompositionId,
} from '@/lib/workspaceComposition';

export function useWorkspaceChrome(
  compositionId: WorkspaceCompositionId,
): WorkspaceChromeConfig {
  const adventureRoute = useAdventureRoute();
  const downtimeRoute = useDowntimeRoute();
  const progressionRoute = useProgressionRoute();
  const adventureWorkspace = useOptionalAdventureWorkspace();

  return useMemo(() => {
    if (!supportsWorkspaceRail(compositionId)) {
      return EMPTY_WORKSPACE_CHROME;
    }

    if (adventureRoute) {
      const showStrip =
        adventureWorkspace?.active &&
        adventureWorkspace.isDMUser &&
        adventureWorkspace.playerPreview;

      return {
        rail: null,
        strip: showStrip ? { items: <AdventureContextStrip /> } : null,
      };
    }

    if (downtimeRoute) {
      return {
        rail: {
          variant: 'tabs',
          start: (
            <DowntimeSectionTabs
              basePath={downtimeRoute.basePath}
              activeSection={downtimeRoute.activeSection}
            />
          ),
        },
        strip: null,
      };
    }

    if (progressionRoute) {
      return {
        rail: {
          variant: 'tabs',
          start: (
            <ProgressionSectionTabs
              basePath={progressionRoute.basePath}
              activeSection={progressionRoute.activeSection}
            />
          ),
        },
        strip: null,
      };
    }

    return EMPTY_WORKSPACE_CHROME;
  }, [compositionId, adventureRoute, downtimeRoute, progressionRoute, adventureWorkspace]);
}
