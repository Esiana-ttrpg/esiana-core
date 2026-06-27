import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { Link } from 'react-router-dom';
import { campaignRelationsPath } from '@/lib/campaignPaths';
import { buildOrganizationStructureProjection } from '@/lib/organizationStructureProjection';
import { parseOrganizationMetadata } from '@/lib/organizationMetadata';
import { EntityRelationChip } from '@/components/entity/EntityRelationChip';
import { FactionGossipSection } from '@/components/entity/FactionGossipSection';
import type { WikiTreeNode } from '@/types/wiki';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface OrganizationStructureTabProps {
  campaignHandle: string;
  orgPageId: string;
  flatPages: WikiTreeNode[];
  isDMUser?: boolean;
}

export function OrganizationStructureTab({
  campaignHandle,
  orgPageId,
  flatPages,
  isDMUser: isDMUserProp,
}: OrganizationStructureTabProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const snapshots = flatPages.map((p) => ({
    id: p.id,
    title: p.title,
    templateType: p.templateType,
    metadata: p.metadata ?? null,
  }));
  const org = parseOrganizationMetadata(
    snapshots.find((s) => s.id === orgPageId)?.metadata,
  );
  const structure = buildOrganizationStructureProjection(orgPageId, snapshots);
  const leader = org.leaderId
    ? snapshots.find((s) => s.id === org.leaderId)
    : null;

  if (!structure) return null;

  return (
    <div className="space-y-6 text-sm">
      <p className="text-xs text-muted">
        Power decomposition — unstable branches surface first, not exhaustive org charts.
      </p>

      <Link
        to={campaignRelationsPath(campaignHandle, {
          lens: 'structure',
          mode: 'chain',
          level: 'cluster',
          focus: `bloc:${orgPageId}`,
        })}
        className="inline-block text-sm font-medium text-primary hover:underline"
      >
        Explore in Relations workspace
      </Link>

      {structure.parentOrgId && structure.parentTitle ? (
        <section className="space-y-2">
          <h2 className={META_SECTION_LABEL_CLASS}>
            Parent organization
          </h2>
          <EntityRelationChip
            campaignHandle={campaignHandle}
            pageId={structure.parentOrgId}
            title={structure.parentTitle}
            templateType="ORGANIZATION"
            flatPages={snapshots}
            subtitle="Structural parent"
          />
        </section>
      ) : null}

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
            subtitle="Leader"
          />
        ) : (
          <p className="text-muted">No leader linked — succession gap.</p>
        )}
      </section>

      {structure.childrenByRole.map((group) => (
        <section key={group.roleLabel} className="space-y-2">
          <h2 className={META_SECTION_LABEL_CLASS}>
            {group.roleLabel}
          </h2>
          <ul className="space-y-2">
            {group.children.map((child) => (
              <li
                key={child.id}
                className={`rounded-lg border p-3 ${
                  child.frictionScore >= 3
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-border/60 bg-surface/30'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <EntityRelationChip
                    campaignHandle={campaignHandle}
                    pageId={child.id}
                    title={child.title}
                    templateType="ORGANIZATION"
                    flatPages={snapshots}
                    subtitle={child.structuralRoleLabel ?? undefined}
                    compact
                  />
                  {child.worldStateLabel ? (
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-muted">
                      {child.worldStateLabel}
                    </span>
                  ) : null}
                  {child.missingLeader ? (
                    <span className="text-[10px] text-amber-500">No leader</span>
                  ) : null}
                  {child.divergesFromParent ? (
                    <span className="text-[10px] text-amber-500">Divergent</span>
                  ) : null}
                </div>
                {child.presenceExcerpt ? (
                  <p className="mt-1 text-xs text-muted">{child.presenceExcerpt}</p>
                ) : null}
                {child.pressureCount > 0 ? (
                  <p className="mt-1 text-xs text-amber-600">
                    {child.pressureCount} active pressure{child.pressureCount === 1 ? '' : 's'}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {structure.children.length === 0 ? (
        <p className="text-muted">No sub-organizations linked.</p>
      ) : null}

      {structure.totalDescendantCount > structure.children.length ? (
        <p className="text-xs text-muted">
          +{structure.totalDescendantCount - structure.children.length} nested divisions (not
          expanded)
        </p>
      ) : null}
    </div>
  );
}
