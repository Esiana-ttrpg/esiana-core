import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { campaignRelationsPath } from '@/lib/campaignPaths';
import { parseOrganizationMetadata, resolveOrgStanceAt } from '@/lib/organizationMetadata';
import {
  charactersInOrg,
  childOrgsOf,
  type WikiPageLineageSnapshot,
} from '@/lib/entityProjectionQueries';
import { parseCharacterLineageMetadata } from '@/lib/characterLineageMetadata';
import { useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';
import { ORG_RELATION_CATEGORIES, isRelationVisibleToViewer } from '@/lib/entityRelationTypes';
import { isProjectionDebugEnabled } from '@/lib/entityProjectionDebug';
import { ENTITY_EMPTY_COPY } from '@/lib/entityEmptyCopy';
import { EntityRelationChip } from '@/components/entity/EntityRelationChip';
import { ProjectionDebugPanel } from '@/components/entity/ProjectionDebugPanel';
import { TemporalStatusBadge } from '@/components/entity/TemporalStatusBadge';
import type { WikiTreeNode } from '@/types/wiki';
import { FactionGossipSection } from '@/components/entity/FactionGossipSection';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface OrganizationStructureTabProps {
  campaignHandle: string;
  orgPageId: string;
  orgMetadata: unknown;
  flatPages: WikiTreeNode[];
  isDMUser?: boolean;
}

export function OrganizationStructureTab({
  campaignHandle,
  orgPageId,
  orgMetadata,
  flatPages,
  isDMUser: isDMUserProp,
}: OrganizationStructureTabProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const org = parseOrganizationMetadata(orgMetadata);
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
      })),
    [flatPages],
  );

  const pageById = useMemo(
    () => new Map(flatPages.map((page) => [page.id, page])),
    [flatPages],
  );

  const previewContext = useMemo(
    () => ({
      campaignNow,
      isDMUser,
      viewerOrgId: orgPageId,
      viewerPageId: orgPageId,
    }),
    [campaignNow, isDMUser, orgPageId],
  );

  const members = charactersInOrg(orgPageId, snapshots, campaignNow, isDMUser);
  const childOrgs = childOrgsOf(orgPageId, snapshots);
  const leader = org.leaderId ? pageById.get(org.leaderId) : null;

  const relationsByType = ORG_RELATION_CATEGORIES.map((relationType) => {
    const entries = org.relations
      .map((relation) => {
        const event = resolveOrgStanceAt(relation, campaignNow, relationType);
        if (!event) return null;
        if (!isRelationVisibleToViewer(event.visibility, isDMUser)) return null;
        const target = pageById.get(relation.targetOrgId);
        if (!target) return null;
        return { relation, event, target };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    return { relationType, entries };
  }).filter((group) => group.entries.length > 0);

  const debugProjection = useMemo(
    () => ({
      leaderId: org.leaderId,
      memberCount: members.length,
      childOrgCount: childOrgs.length,
      relationsByType: relationsByType.map((g) => ({
        type: g.relationType,
        count: g.entries.length,
      })),
      campaignNow,
    }),
    [org.leaderId, members.length, childOrgs.length, relationsByType, campaignNow],
  );

  return (
    <div className="space-y-6 text-sm">
      <Link
        to={campaignRelationsPath(campaignHandle, {
          lens: 'structure',
          mode: 'chain',
          level: 'cluster',
          focus: `bloc:${orgPageId}`,
        })}
        className="inline-block text-sm font-medium text-primary hover:underline"
      >
        Explore organization in Relations
      </Link>
      <FactionGossipSection campaignHandle={campaignHandle} orgPageId={orgPageId} />
      <section className="space-y-2">
        <h2 className={META_SECTION_LABEL_CLASS}>
          Leadership
        </h2>
        {leader ? (
          <EntityRelationChip
            campaignHandle={campaignHandle}
            pageId={leader.id}
            title={leader.title}
            templateType={leader.templateType}
            flatPages={snapshots}
            previewContext={previewContext}
            subtitle="Leader"
          />
        ) : (
          <p className="text-muted">No leader linked.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className={META_SECTION_LABEL_CLASS}>
          Members
        </h2>
        {members.length === 0 ? (
          <p className="text-muted">{ENTITY_EMPTY_COPY.orgMembers}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {members.map((member) => {
              const lineage = parseCharacterLineageMetadata(member.metadata);
              const aff = lineage.orgAffiliations.find((a) => a.orgId === orgPageId);
              return (
                <li key={member.id} className="flex flex-col gap-1">
                  <EntityRelationChip
                    campaignHandle={campaignHandle}
                    pageId={member.id}
                    title={member.title}
                    templateType={member.templateType}
                    subtitle={aff?.role ?? undefined}
                    flatPages={snapshots}
                    previewContext={previewContext}
                    compact
                  />
                  {aff ? (
                    <TemporalStatusBadge
                      variant="active-range"
                      startDate={aff.startDate}
                      endDate={aff.endDate}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className={META_SECTION_LABEL_CLASS}>
          Sub-organizations
        </h2>
        {childOrgs.length === 0 ? (
          <p className="text-muted">No child organizations.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {childOrgs.map((child) => (
              <li key={child.id}>
                <EntityRelationChip
                  campaignHandle={campaignHandle}
                  pageId={child.id}
                  title={child.title}
                  templateType={child.templateType}
                  flatPages={snapshots}
                  previewContext={previewContext}
                  compact
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className={META_SECTION_LABEL_CLASS}>
          Relations (current)
        </h2>
        {relationsByType.length === 0 ? (
          <p className="text-muted">{ENTITY_EMPTY_COPY.orgRelations}</p>
        ) : (
          relationsByType.map((group) => (
            <div key={group.relationType} className="space-y-2">
              <h3 className="text-[10px] font-medium uppercase text-muted">
                {group.relationType}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {group.entries.map(({ target, event, relation }) => (
                  <li key={relation.id} className="flex flex-col gap-1">
                    <EntityRelationChip
                      campaignHandle={campaignHandle}
                      pageId={target.id}
                      title={target.title}
                      templateType={target.templateType}
                      stance={event.stance}
                      relationType={event.relationType}
                      visibility={event.visibility}
                      flatPages={snapshots}
                      previewContext={previewContext}
                    />
                    {event.note ? (
                      <TemporalStatusBadge
                        variant="active-range"
                        startDate={event.effectiveDate}
                        endDate={null}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {debugEnabled ? (
        <ProjectionDebugPanel
          title="Structure tab debug"
          projection={debugProjection}
          queryInputs={{ orgPageId, campaignNow, isDMUser }}
        />
      ) : null}
    </div>
  );
}
