import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { campaignRelationsPath } from '@/lib/campaignPaths';
import { parseCharacterLineageMetadata } from '@/lib/characterLineageMetadata';
import {
  familyLivingMembers,
  familyMemberSnapshots,
  type WikiPageLineageSnapshot,
} from '@/lib/entityProjectionQueries';
import { isProjectionDebugEnabled } from '@/lib/entityProjectionDebug';
import { ENTITY_EMPTY_COPY } from '@/lib/entityEmptyCopy';
import { isRelationVisibleToViewer } from '@/lib/entityRelationTypes';
import { useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';
import { EntityRelationChip } from '@/components/entity/EntityRelationChip';
import { LineageGenerationsConnectors } from '@/components/entity/LineageGenerationsConnectors';
import { ProjectionDebugPanel } from '@/components/entity/ProjectionDebugPanel';
import { TemporalStatusBadge } from '@/components/entity/TemporalStatusBadge';
import { isCharacterEntityPage } from '@shared/resolveCanonicalEntityCategory';
import type { WikiTreeNode } from '@/types/wiki';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface FamilyLineageTabProps {
  campaignHandle: string;
  familyPageId: string;
  flatPages: WikiTreeNode[];
  isDMUser?: boolean;
}

export function FamilyLineageTab({
  campaignHandle,
  familyPageId,
  flatPages,
  isDMUser: isDMUserProp,
}: FamilyLineageTabProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const campaignNow = useCampaignChronologyNow(campaignHandle);
  const [searchParams] = useSearchParams();
  const debugEnabled = isProjectionDebugEnabled(searchParams, isDMUser);

  const snapshots: WikiPageLineageSnapshot[] = useMemo(
    () =>
      flatPages.map((page) => ({
        id: page.id,
        title: page.title,
        templateType: page.templateType,
        metadata: page.metadata,
        parentId: page.parentId,
      })),
    [flatPages],
  );

  const previewContext = useMemo(
    () => ({
      campaignNow,
      isDMUser,
      viewerPageId: familyPageId,
    }),
    [campaignNow, isDMUser, familyPageId],
  );

  const familyPage = useMemo(
    () => snapshots.find((page) => page.id === familyPageId) ?? null,
    [snapshots, familyPageId],
  );

  const familyMetadata = familyPage?.metadata;

  const characterPages = useMemo(
    () => snapshots.filter((p) => isCharacterEntityPage(p, snapshots)),
    [snapshots],
  );

  const members = familyLivingMembers(
    familyPageId,
    familyMetadata,
    characterPages,
    campaignNow,
  );

  const allFamilyMembers = familyMemberSnapshots(
    familyPageId,
    familyMetadata,
    characterPages,
  );

  const generations = useMemo(() => {
    const grouped = new Map<number, WikiPageLineageSnapshot[]>();
    for (const member of allFamilyMembers) {
      const lineage = parseCharacterLineageMetadata(member.metadata);
      const year = lineage.birthDate?.year ?? 0;
      const bucket = grouped.get(year) ?? [];
      bucket.push(member);
      grouped.set(year, bucket);
    }
    return [...grouped.entries()]
      .sort(([a], [b]) => a - b)
      .map(([year, rowMembers]) => ({ year, members: rowMembers }));
  }, [allFamilyMembers]);

  function visibleParentIds(member: WikiPageLineageSnapshot): string[] {
    const lineage = parseCharacterLineageMetadata(member.metadata);
    return lineage.parentLinks
      .filter((link) => isRelationVisibleToViewer(link.visibility, isDMUser))
      .filter((link) => link.isPublic || isDMUser)
      .map((link) => link.targetCharacterId);
  }

  function renderMemberCard(member: WikiPageLineageSnapshot) {
    const lineage = parseCharacterLineageMetadata(member.metadata);
    const parentIds = visibleParentIds(member);
    const alive = !lineage.deathDate;

    return (
      <div className="rounded-lg border border-border bg-surface/40 p-3">
        <EntityRelationChip
          campaignHandle={campaignHandle}
          pageId={member.id}
          title={member.title}
          templateType={member.templateType}
          subtitle={lineage.lineageRole ?? undefined}
          flatPages={snapshots}
          previewContext={previewContext}
          compact
        />
        {lineage.lineageRole ? (
          <p className="mt-1 text-[10px] uppercase text-muted">{lineage.lineageRole}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-1">
          {lineage.birthDate ? (
            <TemporalStatusBadge variant="born" date={lineage.birthDate} />
          ) : null}
          {lineage.deathDate ? (
            <TemporalStatusBadge variant="died" date={lineage.deathDate} />
          ) : alive ? (
            <TemporalStatusBadge
              variant="active-range"
              startDate={lineage.birthDate}
              endDate={null}
            />
          ) : null}
        </div>
        {parentIds.length > 0 ? (
          <p className="mt-2 text-[10px] text-muted">
            Parents:{' '}
            {parentIds
              .map((id) => snapshots.find((p) => p.id === id)?.title ?? id)
              .join(', ')}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-sm">
      <Link
        to={campaignRelationsPath(campaignHandle, {
          lens: 'kinship',
          mode: 'generations',
          level: 'summary',
          focus: `bloc:${familyPageId}`,
        })}
        className="inline-block text-sm font-medium text-primary hover:underline"
      >
        Explore house in Relations
      </Link>
      <section className="space-y-2">
        <h2 className={META_SECTION_LABEL_CLASS}>
          Living members
        </h2>
        {members.length === 0 ? (
          <p className="text-muted">{ENTITY_EMPTY_COPY.familyLiving}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {members.map((member) => (
              <li key={member.id}>
                <EntityRelationChip
                  campaignHandle={campaignHandle}
                  pageId={member.id}
                  title={member.title}
                  templateType={member.templateType}
                  flatPages={snapshots}
                  previewContext={previewContext}
                  compact
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className={META_SECTION_LABEL_CLASS}>
          Generations
        </h2>
        {generations.length === 0 ? (
          <p className="text-muted">{ENTITY_EMPTY_COPY.familyGenerations}</p>
        ) : (
          <LineageGenerationsConnectors
            generations={generations}
            allFamilyMembers={allFamilyMembers}
            renderCard={renderMemberCard}
          />
        )}
      </section>

      {debugEnabled ? (
        <ProjectionDebugPanel
          title="Lineage tab debug"
          projection={{ generationCount: generations.length, memberCount: allFamilyMembers.length }}
          queryInputs={{ familyPageId, campaignNow, isDMUser }}
        />
      ) : null}
    </div>
  );
}
