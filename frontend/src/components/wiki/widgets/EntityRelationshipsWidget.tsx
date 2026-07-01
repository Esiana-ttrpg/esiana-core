import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { campaignRelationsPath } from '@/lib/campaignPaths';
import { EntityRelationChip } from '@/components/entity/EntityRelationChip';
import type { WikiPageLineageSnapshot } from '@/lib/entityProjectionQueries';
import { CharacterLineageEditor } from '@/components/entity/CharacterLineageEditor';
import { BlockEmptyState } from '@/components/wiki/BlockEmptyState';
import { useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';
import { useEntityGraphRelationshipProjection } from '@/hooks/useEntityGraphRelationshipProjection';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import type { WikiTreeNode } from '@/types/wiki';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

function surfaceKeyToProjectionTemplate(surfaceKey: SurfaceProfileKey): string {
  switch (surfaceKey) {
    case 'character':
      return 'CHARACTER';
    case 'organization':
      return 'ORGANIZATION';
    case 'family':
      return 'FAMILY';
    default:
      return 'DEFAULT';
  }
}

interface EntityRelationshipsWidgetProps {
  blockId: string;
  campaignHandle: string;
  pageId: string;
  surfaceProfileKey: SurfaceProfileKey;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  isEditingPage: boolean;
  isDMUser?: boolean;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
}

export function EntityRelationshipsWidget({
  blockId,
  campaignHandle,
  pageId,
  surfaceProfileKey,
  metadata,
  flatPages,
  isEditingPage,
  isDMUser: isDMUserProp,
  onMetadataSaved,
}: EntityRelationshipsWidgetProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const campaignNow = useCampaignChronologyNow(campaignHandle);
  const projectionTemplateType = surfaceKeyToProjectionTemplate(surfaceProfileKey);

  const snapshots: WikiPageLineageSnapshot[] = useMemo(
    () =>
      flatPages.map((page) => ({
        id: page.id,
        title: page.title,
        templateType: page.templateType,
        metadata: page.metadata ?? {},
      })),
    [flatPages],
  );

  const relationshipProjection = useEntityGraphRelationshipProjection({
    campaignHandle,
    pageId,
    templateType: projectionTemplateType,
    flatPages: snapshots,
    campaignNow,
    isDMUser,
    enabled: !isEditingPage,
  });

  const previewContext = useMemo(
    () => ({
      campaignNow,
      isDMUser,
      viewerOrgId: surfaceProfileKey === 'organization' ? pageId : undefined,
      viewerPageId: pageId,
      viewerCharacterId: surfaceProfileKey === 'character' ? pageId : undefined,
    }),
    [campaignNow, isDMUser, pageId, surfaceProfileKey],
  );

  const rows = useMemo(() => {
    const { affiliations, bloodlineRoots, diplomaticTensions, narrativeStatusByPageId } =
      relationshipProjection;
    const statusHint = (pageId: string, subtitle?: string) => {
      const label = narrativeStatusByPageId?.[pageId];
      if (!label) return subtitle;
      return subtitle ? `${subtitle} · ${label}` : label;
    };
    const out: Array<{
      key: string;
      pageId: string;
      title: string;
      templateType: string;
      stance?: (typeof diplomaticTensions)[0]['stance'];
      subtitle?: string;
    }> = [];
    for (const aff of affiliations) {
      out.push({
        key: `aff-${aff.org.id}`,
        pageId: aff.org.id,
        title: aff.org.title,
        templateType: aff.org.templateType,
        subtitle: statusHint(aff.org.id, aff.role ?? undefined),
      });
    }
    for (const root of bloodlineRoots) {
      out.push({
        key: `root-${root.character.id}`,
        pageId: root.character.id,
        title: root.character.title,
        templateType: root.character.templateType,
        subtitle: statusHint(root.character.id, root.relationshipType),
      });
    }
    for (const tension of diplomaticTensions) {
      out.push({
        key: `tension-${tension.org.id}-${tension.direction}`,
        pageId: tension.org.id,
        title: tension.org.title,
        templateType: tension.org.templateType,
        stance: tension.stance,
        subtitle: statusHint(tension.org.id, tension.direction),
      });
    }
    return out;
  }, [relationshipProjection]);

  if (isEditingPage && surfaceProfileKey === 'character') {
    return (
      <CharacterLineageEditor
        blockId={blockId}
        campaignHandle={campaignHandle}
        pageId={pageId}
        metadata={metadata}
        flatPages={flatPages}
        onSaved={onMetadataSaved}
        section="relationships"
        bare
      />
    );
  }

  if (rows.length === 0) {
    return (
      <BlockEmptyState
        icon={Users}
        title="No relationships yet"
        description="Affiliations, bloodline, and diplomatic ties appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-2">
        {rows.map((row) => (
          <li key={row.key}>
            <EntityRelationChip
              campaignHandle={campaignHandle}
              pageId={row.pageId}
              title={row.title}
              templateType={row.templateType}
              stance={row.stance ?? null}
              subtitle={row.subtitle}
              flatPages={snapshots}
              previewContext={previewContext}
              compact
            />
          </li>
        ))}
      </ul>
      <Link
        to={campaignRelationsPath(campaignHandle, {
          lens: 'social',
          mode: 'connections',
          level: 'entity',
          focus: `wiki_page:${pageId}`,
        })}
        className="inline-block text-sm font-medium text-primary hover:underline"
      >
        View connections
      </Link>
    </div>
  );
}
