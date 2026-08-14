import type { EntityPageShellViewProps } from '@/lib/entityPageShells/types';
import { InterpretiveLoreHeader } from '@/components/entity/lore/InterpretiveLoreHeader';
import { WikiPageIdentitySubtitle } from '@/components/wiki/WikiPageIdentitySubtitle';
import { NarrativeStatusBadge, NarrativeStatusGmBadge } from '@/components/wiki/NarrativeStatusBadge';
import type { PageNarrativeStatusProjection } from '@shared/pageNarrativeStatus';
import { buildInfoboxProjection } from '@/lib/buildInfoboxProjection';
import { ProfileDetailsCard } from './ProfileDetailsCard';
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
  blocks,
  pageSubview,
  isDMUser,
  isEditingPage,
  narrativeStatus,
  interpretiveSummary,
  professionSubtitle,
  knownForSubtitle,
  players,
  flatPages,
  onBlocksChange,
  wikiPageRenderer,
  loreSemanticPanel,
  continuityPanel,
  eventConsequencesPanel,
}: GenericWikiPageShellViewProps) {
  const showOverviewChrome = pageSubview === 'overview';

  const infoboxBlock = blocks.find((b) => b.type === 'wiki-infobox');
  const infoboxFields =
    (infoboxBlock?.content as { fields?: { key: string; value: string }[] })?.fields ??
    buildInfoboxProjection(templateType, pageData.metadata, flatPages, profileKey);

  function updateInfoboxFields(fields: { key: string; value: string }[]) {
    onBlocksChange((prev) =>
      prev.map((b) =>
        b.type === 'wiki-infobox'
          ? { ...b, content: { ...(b.content as object), fields } }
          : b,
      ),
    );
  }

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

      {showOverviewChrome ? (
        <div className="mb-4">
          <ProfileDetailsCard
            fields={infoboxFields}
            isEditingPage={isEditingPage}
            isDMUser={isDMUser}
            onFieldsChange={updateInfoboxFields}
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
