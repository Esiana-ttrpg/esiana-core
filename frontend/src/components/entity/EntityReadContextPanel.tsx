import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import {
  buildEntityRelationshipProjection,
  type WikiPageLineageSnapshot,
} from '@/lib/entityProjectionQueries';
import { isProjectionDebugEnabled } from '@/lib/entityProjectionDebug';
import { parseFamilyMetadata } from '@/lib/familyMetadata';
import { parseOrganizationMetadata } from '@/lib/organizationMetadata';
import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import type { SurfaceProfileKey } from '@/lib/entitySurfaceProfile';
import { getEntityWorkspaceSlots } from '@/lib/entityWorkspaceSlots';
import { buildEntityWorkspaceEmphasis } from '@/lib/entityWorkspaceEmphasis';
import { useNarrativeViewerContext } from '@/hooks/useNarrativeViewerContext';
import { EntityRelationChip } from './EntityRelationChip';
import { ProjectionDebugPanel } from './ProjectionDebugPanel';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';
interface EntityReadContextPanelProps {
  campaignHandle: string;
  pageId: string;
  surfaceProfileKey: SurfaceProfileKey;
  templateType: string;
  pageMetadata: unknown;
  flatPages: Array<{
    id: string;
    title: string;
    templateType: string;
    metadata?: unknown;
    parentId?: string | null;
  }>;
  isDMUser?: boolean;
  memberRole?: string;
  allowPlayerChronologyManagement?: boolean;
  onViewStructure?: () => void;
}

function EmphasisFacts({ facts }: { facts: Array<{ label: string; value: string }> }) {
  if (facts.length === 0) return null;
  return (
    <dl className="mt-2 space-y-1.5">
      {facts.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="inline font-medium text-foreground after:content-[':']">
            {row.label}
          </dt>{' '}
          <dd className="inline break-words text-muted">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EntityReadContextPanel({
  campaignHandle,
  pageId,
  surfaceProfileKey,
  templateType,
  pageMetadata,
  flatPages,
  isDMUser: isDMUserProp,
  onViewStructure,
}: EntityReadContextPanelProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const slotConfig = getEntityWorkspaceSlots(surfaceProfileKey);
  const previewLimit = slotConfig?.relationshipPreviewLimit ?? 3;

  const viewerCtx = useNarrativeViewerContext({
    campaignHandle,
    role: isDMUser ? 'GAMEMASTER' : 'Player',
  });
  const campaignNow = viewerCtx.campaignNow.dateParts;
  const [searchParams] = useSearchParams();
  const debugEnabled = isProjectionDebugEnabled(searchParams, isDMUser);

  const snapshots: WikiPageLineageSnapshot[] = useMemo(
    () =>
      flatPages.map((page) => ({
        id: page.id,
        title: page.title,
        templateType: page.templateType,
        metadata: page.metadata ?? null,
      })),
    [flatPages],
  );

  const flatPagesKey = useMemo(
    () => snapshots.map((p) => `${p.id}:${p.title}`).join('|'),
    [snapshots],
  );

  const projection = useMemo(
    () =>
      buildEntityRelationshipProjection(
        pageId,
        templateType,
        snapshots,
        campaignNow,
        isDMUser,
      ),
    [pageId, templateType, flatPagesKey, snapshots, campaignNow, isDMUser],
  );

  const emphasis = useMemo(
    () =>
      buildEntityWorkspaceEmphasis(
        surfaceProfileKey,
        pageId,
        pageMetadata,
        snapshots,
        flatPages as import('@/types/wiki').WikiTreeNode[],
      ),
    [surfaceProfileKey, pageId, pageMetadata, snapshots, flatPages],
  );

  const previewContext = useMemo(
    () => ({
      campaignNow,
      isDMUser,
      viewerOrgId: templateType === 'ORGANIZATION' ? pageId : undefined,
      viewerPageId: pageId,
    }),
    [campaignNow, isDMUser, pageId, templateType],
  );

  const leaderOrHead = useMemo(() => {
    if (templateType === 'ORGANIZATION') {
      const org = parseOrganizationMetadata(pageMetadata);
      if (!org.leaderId) return null;
      return snapshots.find((p) => p.id === org.leaderId)?.title ?? null;
    }
    if (templateType === 'FAMILY') {
      const family = parseFamilyMetadata(pageMetadata);
      if (!family.headCharacterId) return null;
      return snapshots.find((p) => p.id === family.headCharacterId)?.title ?? null;
    }
    return null;
  }, [pageMetadata, snapshots, templateType]);

  const affiliationChips = projection.affiliations.slice(0, previewLimit);
  const bloodlineChips = projection.bloodlineRoots.slice(0, previewLimit);
  const tensionChips = projection.diplomaticTensions.slice(0, previewLimit);

  const hasRelationshipContent =
    leaderOrHead ||
    affiliationChips.length > 0 ||
    bloodlineChips.length > 0 ||
    tensionChips.length > 0;

  const hasEmphasisContent =
    emphasis.facts.length > 0 ||
    Boolean(emphasis.locationTrail) ||
    Boolean(emphasis.holderTitle);

  const hasContent = hasRelationshipContent || hasEmphasisContent;
  const emphasisTitle = slotConfig?.emphasisTitle ?? 'At a glance';

  if (!hasContent && !debugEnabled) {
    return null;
  }

  return (
    <section className="mb-4 min-w-0 rounded-lg border border-border bg-surface/40 p-4 text-sm">
      {hasContent || debugEnabled ? (
        <>
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
            <h2 className={META_SECTION_LABEL_CLASS}>
              {emphasisTitle}
            </h2>
            {onViewStructure && slotConfig?.structureLinkLabel ? (
              <button
                type="button"
                onClick={onViewStructure}
                className="text-xs font-medium text-primary hover:underline"
              >
                View full {slotConfig.structureLinkLabel} →
              </button>
            ) : null}
          </div>

          <EmphasisFacts facts={emphasis.facts} />

          {emphasis.locationTrail ? (
            <p className="mt-2 break-words text-muted">
              <span className="font-medium text-foreground">Within:</span>{' '}
              {emphasis.locationTrail}
            </p>
          ) : null}

          {emphasis.holderTitle && emphasis.holderId ? (
            <p className="mt-2 text-muted">
              <span className="font-medium text-foreground">Current holder:</span>{' '}
              <Link
                to={campaignCategoryChildPath(
                  campaignHandle,
                  emphasis.holderId,
                  'Characters',
                )}
                className="break-words text-primary hover:underline"
              >
                {emphasis.holderTitle}
              </Link>
            </p>
          ) : null}

          {leaderOrHead ? (
            <p className="mt-2 text-muted">
              <span className="font-medium text-foreground">
                {templateType === 'ORGANIZATION' ? 'Leader' : 'Head'}:
              </span>{' '}
              {leaderOrHead}
            </p>
          ) : null}

          {affiliationChips.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {affiliationChips.map((row) => (
                <li key={row.org.id}>
                  <EntityRelationChip
                    campaignHandle={campaignHandle}
                    pageId={row.org.id}
                    title={row.role ? `${row.org.title} (${row.role})` : row.org.title}
                    templateType={row.org.templateType}
                    flatPages={snapshots}
                    previewContext={previewContext}
                    compact
                  />
                </li>
              ))}
            </ul>
          ) : null}

          {bloodlineChips.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {bloodlineChips.map((row) => (
                <li key={row.character.id}>
                  <EntityRelationChip
                    campaignHandle={campaignHandle}
                    pageId={row.character.id}
                    title={`${row.character.title} (${row.relationshipType})`}
                    templateType={row.character.templateType}
                    flatPages={snapshots}
                    previewContext={previewContext}
                    compact
                  />
                </li>
              ))}
            </ul>
          ) : null}

          {tensionChips.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {tensionChips.map((row) => (
                <li key={`${row.org.id}-${row.direction}`}>
                  <EntityRelationChip
                    campaignHandle={campaignHandle}
                    pageId={row.org.id}
                    title={row.org.title}
                    templateType={row.org.templateType}
                    stance={row.stance}
                    flatPages={snapshots}
                    previewContext={previewContext}
                    compact
                  />
                </li>
              ))}
            </ul>
          ) : null}

          {debugEnabled ? (
            <ProjectionDebugPanel
              projection={projection}
              queryInputs={{
                pageId,
                templateType,
                campaignNow,
                isDMUser,
              }}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
