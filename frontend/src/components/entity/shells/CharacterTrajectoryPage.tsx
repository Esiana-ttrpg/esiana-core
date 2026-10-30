import { useEffect, useState } from 'react';
import { PlanningEraTrajectoriesBlock } from '@/components/entity/PlanningEraTrajectoriesBlock';
import { parseCharacterMetadata, type CharacterIdentityFields } from '@/lib/characterMetadata';
import { updateCharacterMetadata } from '@/lib/wiki';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';
import type { EntityOverviewProps } from '@/lib/entityPageShells/types';
import { EntityPageSection } from './EntityPageSection';

export function CharacterTrajectoryPage({
  campaignHandle, pageId, pageMetadata, isDMUser: isDMUserProp, isEditingPage, onMetadataSaved,
}: Pick<EntityOverviewProps, 'campaignHandle' | 'pageId' | 'pageMetadata' | 'isDMUser' | 'isEditingPage' | 'onMetadataSaved'>) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const canEdit = isDMUser && isEditingPage;
  const [trajectoryDraft, setTrajectoryDraft] = useState<CharacterIdentityFields>(() =>
    parseCharacterMetadata(pageMetadata),
  );

  useEffect(() => {
    setTrajectoryDraft(parseCharacterMetadata(pageMetadata));
  }, [pageMetadata]);

  if (!isDMUser) return null;
  return (
    <>
      {canEdit || trajectoryDraft.eraTrajectories.length > 0 ? (
        <EntityPageSection id="character-trajectories" title="Trajectory" wikiFacts>
          {canEdit ? (
            <PlanningEraTrajectoriesBlock
              campaignHandle={campaignHandle}
              draft={trajectoryDraft}
              setDraft={setTrajectoryDraft}
              onPersist={async (patch) => {
                const result = await updateCharacterMetadata(campaignHandle, pageId, patch);
                onMetadataSaved(result.metadata);
              }}
              emptyHint="No trajectories on this character yet. Trajectories are opt-in directions over time."
            />
          ) : (
            <ul className="space-y-1 text-sm text-muted-foreground">
              {trajectoryDraft.eraTrajectories.map((row) => (
                <li key={row.eraId}>
                  {row.direction?.trim() || 'Trajectory'}
                  {row.outcome?.trim() ? ` → ${row.outcome.trim()}` : ''}
                </li>
              ))}
            </ul>
          )}
        </EntityPageSection>
      ) : null}

      {!canEdit && trajectoryDraft.eraTrajectories.length === 0 ? (
        <p className="text-sm text-muted">No trajectories on this character yet.</p>
      ) : null}
    </>
  );
}
