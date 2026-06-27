import { META_SECTION_LABEL_CLASS, TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { Link } from 'react-router-dom';
import { AncestryMetadataEditor } from '@/components/entity/AncestryMetadataEditor';
import {
  ANCESTRY_ENTITY_KIND_LABELS,
  parseAncestryMetadata,
  pageTitleById,
} from '@/lib/ancestryMetadata';
import type { AncestryIdentityProjection } from '@/lib/ancestryIdentityProjection';
import { campaignWikiPath } from '@/lib/campaignPaths';
import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import type { WikiTreeNode } from '@/types/wiki';
import { NarrativeVisibilityBadge } from './NarrativeVisibilityBadge';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface AncestryHeroSurfaceProps {
  campaignHandle: string;
  pageId: string;
  isDMUser?: boolean;
  isEditingPage: boolean;
  pageVisibility: string;
  discovery?: DiscoveryStateProjection | null;
  onVisibilityChange?: (next: 'Public' | 'Party' | 'DM_Only') => void | Promise<void>;
  onEditField?: (fieldKey: string) => void;
  identityProjection: AncestryIdentityProjection | null;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  blockId: string;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  focusField?: string | null;
  showIdentityEditor?: boolean;
}

function KindChip({ kind }: { kind: string }) {
  return (
    <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
      {kind}
    </span>
  );
}

export function AncestryHeroSurface({
  campaignHandle,
  pageId,
  isDMUser: isDMUserProp,
  isEditingPage,
  pageVisibility,
  discovery,
  onVisibilityChange,
  onEditField,
  identityProjection,
  metadata,
  flatPages,
  blockId,
  onMetadataSaved,
  focusField,
  showIdentityEditor = false,
}: AncestryHeroSurfaceProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const ancestry = parseAncestryMetadata(metadata);
  const parentTitle = pageTitleById(flatPages, ancestry.parentAncestryId);
  const secondaryParentTitle = pageTitleById(flatPages, ancestry.secondaryParentAncestryId);

  if (showIdentityEditor && isEditingPage && isDMUser) {
    return (
      <section className="mb-4 rounded-xl border border-border/60 bg-surface/30 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className={META_SECTION_LABEL_CLASS}>
            Ancestry identity
          </h2>
          <NarrativeVisibilityBadge
            pageVisibility={pageVisibility}
            discovery={discovery}
            isEditingPage={isEditingPage}
            onVisibilityChange={onVisibilityChange}
          />
        </div>
        <AncestryMetadataEditor
          campaignHandle={campaignHandle}
          pageId={pageId}
          metadata={metadata}
          flatPages={flatPages}
          onSaved={onMetadataSaved}
          section="identity"
          bare
          focusField={focusField ?? null}
        />
      </section>
    );
  }

  const displayName = identityProjection?.displayName?.trim() || 'Unnamed ancestry';
  const showPortrait = Boolean(identityProjection?.portraitUrl);

  return (
    <section className="relative mb-4 overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-violet-500/5 via-surface/40 to-surface/20">
      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:p-6">
        <div className="shrink-0">
          {showPortrait ? (
            <img
              src={identityProjection!.portraitUrl!}
              alt=""
              className="size-28 max-h-36 max-w-36 rounded-xl border border-border/60 object-cover shadow-lg sm:size-36"
            />
          ) : (
            <div className="flex size-28 items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface/60 text-xs text-muted backdrop-blur-sm sm:size-36">
              No portrait
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className={TYPE_DISPLAY_CLASS}>
                {displayName}
              </h1>
              {identityProjection?.identityLine ? (
                <p className="mt-0.5 text-sm font-medium text-primary/90">
                  {identityProjection.identityLine}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <KindChip kind={ANCESTRY_ENTITY_KIND_LABELS[ancestry.entityKind]} />
              <NarrativeVisibilityBadge
                pageVisibility={pageVisibility}
                discovery={discovery}
                isEditingPage={false}
              />
            </div>
          </div>

          {ancestry.parentAncestryId && parentTitle ? (
            <p className="text-sm text-muted">
              Descended from{' '}
              <Link
                to={campaignWikiPath(campaignHandle, ancestry.parentAncestryId, flatPages)}
                className="font-medium text-primary hover:underline"
              >
                {parentTitle}
              </Link>
              {ancestry.secondaryParentAncestryId && secondaryParentTitle ? (
                <>
                  {' '}
                  ×{' '}
                  <Link
                    to={campaignWikiPath(campaignHandle, ancestry.secondaryParentAncestryId, flatPages)}
                    className="font-medium text-primary hover:underline"
                  >
                    {secondaryParentTitle}
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}

          {ancestry.identitySummary ? (
            <p className="text-sm leading-relaxed text-foreground/80">{ancestry.identitySummary}</p>
          ) : identityProjection?.knownFor ? (
            <p className="text-sm text-foreground/80">{identityProjection.knownFor}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 text-xs">
            {ancestry.ancestryType ? (
              <span className="rounded-full border border-border/60 bg-surface/50 px-2 py-0.5 backdrop-blur-sm">
                {ancestry.ancestryType}
              </span>
            ) : null}
            {ancestry.homeland ? (
              <span className="rounded-full border border-border/60 bg-surface/50 px-2 py-0.5 backdrop-blur-sm">
                {ancestry.homeland}
              </span>
            ) : ancestry.region ? (
              <span className="rounded-full border border-border/60 bg-surface/50 px-2 py-0.5 backdrop-blur-sm">
                {ancestry.region}
              </span>
            ) : null}
          </div>

          {isDMUser && onEditField && !isEditingPage ? (
            <button
              type="button"
              onClick={() => onEditField('ancestryType')}
              className="text-xs text-primary hover:underline"
            >
              Edit ancestry profile
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
