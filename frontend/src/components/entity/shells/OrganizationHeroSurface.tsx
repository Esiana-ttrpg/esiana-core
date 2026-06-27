import { META_SECTION_LABEL_CLASS, TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { Link } from 'react-router-dom';
import { OrganizationMetadataEditor } from '@/components/entity/OrganizationMetadataEditor';
import { OrganizationSymbolGlyph } from '@/components/entity/shells/OrganizationSymbolGlyph';
import { parseOrganizationMetadata } from '@/lib/organizationMetadata';
import { campaignWikiPath } from '@/lib/campaignPaths';
import type { OrganizationIdentityProjection } from '@/lib/organizationIdentityProjection';
import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import type { WikiTreeNode } from '@/types/wiki';
import { NarrativeVisibilityBadge } from './NarrativeVisibilityBadge';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface OrganizationHeroSurfaceProps {
  campaignHandle: string;
  pageId: string;
  isDMUser?: boolean;
  isEditingPage: boolean;
  pageVisibility: string;
  discovery?: DiscoveryStateProjection | null;
  onVisibilityChange?: (next: 'Public' | 'Party' | 'DM_Only') => void | Promise<void>;
  onEditField?: (fieldKey: string) => void;
  identityProjection: OrganizationIdentityProjection | null;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  blockId: string;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  focusField?: string | null;
  showIdentityEditor?: boolean;
  editorSection?: 'identity' | 'symbol' | 'pressures' | 'duality' | 'leadership';
}

function StateChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
      {label}
    </span>
  );
}

function MetaChip({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <span
      className={`rounded-full border border-border/60 bg-surface/50 px-2 py-0.5 text-xs backdrop-blur-sm ${
        muted ? 'text-muted' : 'text-foreground/80'
      }`}
    >
      {label}
    </span>
  );
}

export function OrganizationHeroSurface({
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
  editorSection = 'identity',
}: OrganizationHeroSurfaceProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const org = parseOrganizationMetadata(metadata);
  const isSecret = org.organizationalVisibility === 'secret' || org.organizationalVisibility === 'quiet';
  const tint = identityProjection?.doctrineTint;

  if (showIdentityEditor && isEditingPage && isDMUser) {
    return (
      <section
        className="relative mb-4 overflow-hidden rounded-xl border border-border/60 bg-surface/30 p-4 sm:p-5"
        style={tint ? { borderLeftWidth: 4, borderLeftColor: tint } : undefined}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className={META_SECTION_LABEL_CLASS}>
            Organization identity
          </h2>
          <NarrativeVisibilityBadge
            pageVisibility={pageVisibility}
            discovery={discovery}
            isEditingPage={isEditingPage}
            onVisibilityChange={onVisibilityChange}
          />
        </div>
        <OrganizationMetadataEditor
          blockId={blockId}
          campaignHandle={campaignHandle}
          pageId={pageId}
          metadata={metadata}
          flatPages={flatPages}
          onSaved={onMetadataSaved}
          section={editorSection}
          bare
          focusField={focusField ?? null}
        />
      </section>
    );
  }

  const displayName = identityProjection?.displayName?.trim() || 'Unnamed organization';

  return (
    <section
      className={`relative mb-4 overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-amber-500/5 via-surface/40 to-surface/20 ${
        isSecret ? 'opacity-90' : ''
      }`}
      style={tint ? { borderLeftWidth: 4, borderLeftColor: tint } : undefined}
    >
      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-6">
        <OrganizationSymbolGlyph
          preset={identityProjection?.symbolPreset ?? null}
          doctrineTint={identityProjection?.doctrineTint}
          emblemUrl={identityProjection?.emblemUrl}
          size="lg"
        />

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
              {identityProjection?.worldStateLabel ? (
                <StateChip label={identityProjection.worldStateLabel} />
              ) : null}
              <NarrativeVisibilityBadge
                pageVisibility={pageVisibility}
                discovery={discovery}
                isEditingPage={false}
              />
            </div>
          </div>

          {identityProjection?.parentOrgId && identityProjection.parentTitle ? (
            <p className="text-sm text-muted">
              Part of{' '}
              <Link
                to={campaignWikiPath(campaignHandle, identityProjection.parentOrgId, flatPages)}
                className="font-medium text-primary hover:underline"
              >
                {identityProjection.parentTitle}
              </Link>
            </p>
          ) : null}

          {identityProjection?.publicPurpose ? (
            <p className="text-sm leading-relaxed text-foreground/80">
              {identityProjection.publicPurpose}
            </p>
          ) : null}

          {identityProjection?.streetBelief ? (
            <p className="text-sm italic text-muted">
              Street belief: {identityProjection.streetBelief}
            </p>
          ) : null}

          {isDMUser && org.privateAgenda ? (
            <p className="rounded border border-violet-500/30 bg-violet-500/5 px-2 py-1 text-xs text-violet-200">
              Private agenda: {org.privateAgenda}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 text-xs">
            {identityProjection?.influenceModeLabel ? (
              <MetaChip label={identityProjection.influenceModeLabel} />
            ) : null}
            {identityProjection?.visibilityLabel ? (
              <MetaChip label={identityProjection.visibilityLabel} muted={isSecret} />
            ) : null}
            {identityProjection?.operationalScaleLabel ? (
              <MetaChip label={identityProjection.operationalScaleLabel} />
            ) : null}
            {org.orgType ? <MetaChip label={org.orgType} /> : null}
          </div>

          {isDMUser && onEditField && !isEditingPage ? (
            <button
              type="button"
              onClick={() => onEditField('publicPurpose')}
              className="text-xs text-primary hover:underline"
            >
              Edit organization profile
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
