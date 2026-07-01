import type { EntityPageShellViewProps } from '@/lib/entityPageShells/types';
import { InterpretiveLoreHeader } from '@/components/entity/lore/InterpretiveLoreHeader';
import { WikiPageIdentitySubtitle } from '@/components/wiki/WikiPageIdentitySubtitle';
import { NarrativeStatusBadge, NarrativeStatusGmBadge } from '@/components/wiki/NarrativeStatusBadge';
import type { PageNarrativeStatusProjection } from '@shared/pageNarrativeStatus';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import type { InterpretiveSummaryResponse } from '@/lib/loreKnowledgeApi';
import type { WikiPlayerEntry, WikiTreeNode } from '@/types/wiki';
import { SURFACE_SILENT_CLASS } from '@/lib/surfaceLayout';

export interface GenericWikiPageShellViewProps extends EntityPageShellViewProps {
  profileKey: SurfaceProfileKey;
  narrativeStatus?: PageNarrativeStatusProjection | null;
  interpretiveSummary: InterpretiveSummaryResponse | null;
  professionSubtitle: string;
  knownForSubtitle: string;
  players: WikiPlayerEntry[];
  eventConsequencesPanel?: React.ReactNode;
}

export function GenericWikiPageShellView({
  pageId,
  profileKey,
  templateType,
  displayTitle,
  pageData,
  pageSubview,
  isDMUser,
  narrativeStatus,
  interpretiveSummary,
  professionSubtitle,
  knownForSubtitle,
  players,
  flatPages,
  wikiPageRenderer,
  loreSemanticPanel,
  continuityPanel,
  eventConsequencesPanel,
}: GenericWikiPageShellViewProps) {
  const showOverviewChrome = pageSubview === 'overview';

  return (
    <div className={`min-w-0 w-full ${SURFACE_SILENT_CLASS}`}>
      {showOverviewChrome ? (
        <div className="mb-4 min-w-0 space-y-2 border-b border-focal-muted/15 pb-4">
          {narrativeStatus ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {isDMUser ? (
                <NarrativeStatusGmBadge narrativeStatus={narrativeStatus} />
              ) : (
                <NarrativeStatusBadge narrativeStatus={narrativeStatus} />
              )}
            </div>
          ) : null}
          <InterpretiveLoreHeader
            summary={interpretiveSummary}
            nameProjection={interpretiveSummary?.nameProjection ?? null}
          />
          <WikiPageIdentitySubtitle
            pageId={pageId}
            profileKey={profileKey}
            templateType={templateType}
            profession={professionSubtitle}
            knownFor={knownForSubtitle}
            players={players}
            flatPages={flatPages}
          />
        </div>
      ) : null}

      {loreSemanticPanel}
      {pageSubview === 'continuity' && continuityPanel ? continuityPanel : null}
      {eventConsequencesPanel}
      {wikiPageRenderer}
    </div>
  );
}
