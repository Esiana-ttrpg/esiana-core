import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { OrganizationMetadataEditor } from '@/components/entity/OrganizationMetadataEditor';
import { campaignRelationsPath } from '@/lib/campaignPaths';
import {
  ORG_RELATION_CATEGORIES,
  isRelationVisibleToViewer,
} from '@/lib/entityRelationTypes';
import { parseOrganizationMetadata, resolveOrgStanceAt } from '@/lib/organizationMetadata';
import { useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';
import { EntityRelationChip } from '@/components/entity/EntityRelationChip';
import type { WikiPageBlock, WikiTreeNode } from '@/types/wiki';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface OrganizationRelationsTabProps {
  campaignHandle: string;
  pageId: string;
  pageMetadata: unknown;
  flatPages: WikiTreeNode[];
  isEditingPage: boolean;
  isDMUser?: boolean;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  displayBlocks: WikiPageBlock[];
  wikiPageRenderer: ReactNode;
}

export function OrganizationRelationsTab({
  campaignHandle,
  pageId,
  pageMetadata,
  flatPages,
  isEditingPage,
  isDMUser: isDMUserProp,
  onMetadataSaved,
  displayBlocks,
  wikiPageRenderer,
}: OrganizationRelationsTabProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const campaignNow = useCampaignChronologyNow(campaignHandle);
  const org = parseOrganizationMetadata(pageMetadata);
  const snapshots = flatPages.map((p) => ({
    id: p.id,
    title: p.title,
    templateType: p.templateType,
    metadata: p.metadata ?? null,
  }));
  const pageById = new Map(snapshots.map((p) => [p.id, p]));

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

  const hasBacklinks = displayBlocks.some((b) => b.type === 'wiki-backlinks');

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Political gravity — institutional relations, not ally/enemy lists.
      </p>

      <Link
        to={campaignRelationsPath(campaignHandle, {
          lens: 'blocs',
          focus: `bloc:${pageId}`,
        })}
        className="text-sm font-medium text-primary hover:underline"
      >
        Open Relations workspace
      </Link>

      {isEditingPage && isDMUser ? (
        <OrganizationMetadataEditor
          campaignHandle={campaignHandle}
          pageId={pageId}
          metadata={pageMetadata}
          flatPages={flatPages}
          onSaved={onMetadataSaved}
          section="diplomacy"
          bare
        />
      ) : (
        relationsByType.map((group) => (
          <section
            key={group.relationType}
            className="rounded-lg border border-border/60 bg-surface/40 p-4"
          >
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              {group.relationType}
            </h3>
            <ul className="space-y-2">
              {group.entries.map(({ event, target }) => (
                <li key={`${target.id}-${event.id}`} className="flex flex-wrap items-center gap-2">
                  <EntityRelationChip
                    campaignHandle={campaignHandle}
                    pageId={target.id}
                    title={target.title}
                    templateType={target.templateType}
                    flatPages={snapshots}
                    subtitle={`${event.stance}${event.note ? ` — ${event.note}` : ''}`}
                    compact
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {relationsByType.length === 0 && !isEditingPage ? (
        <p className="text-sm text-muted">No diplomatic relations recorded.</p>
      ) : null}

      {hasBacklinks ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Connected knowledge
          </h3>
          {wikiPageRenderer}
        </section>
      ) : null}
    </div>
  );
}
