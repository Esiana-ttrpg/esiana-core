import { BestiaryMetadataEditor } from '@/components/entity/BestiaryMetadataEditor';
import type { DiscoveryStateProjection } from '@shared/discoveryProjection';
import type {
  BestiaryIdentityProjection,
  BestiaryIntelProjection,
} from '@/lib/bestiaryIdentityProjection';
import { resolveCreatureEnvironmentTint } from '@/lib/bestiaryIdentityProjection';
import type { WikiTreeNode } from '@/types/wiki';
import { NarrativeVisibilityBadge } from './NarrativeVisibilityBadge';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface CreatureHeroSurfaceProps {
  campaignHandle: string;
  pageId: string;
  isDMUser?: boolean;
  isEditingPage: boolean;
  pageVisibility: string;
  discovery?: DiscoveryStateProjection | null;
  onVisibilityChange?: (next: 'Public' | 'Party' | 'DM_Only') => void | Promise<void>;
  onEditField?: (fieldKey: string) => void;
  identityProjection: BestiaryIdentityProjection | null;
  intelProjection: BestiaryIntelProjection;
  metadata: unknown;
  flatPages: WikiTreeNode[];
  blockId: string;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  focusField?: string | null;
  showIdentityEditor?: boolean;
}

function ThreatBadge({ threat }: { threat: string | null }) {
  if (!threat?.trim()) return null;
  return (
    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
      {threat}
    </span>
  );
}

export function CreatureHeroSurface({
  campaignHandle,
  pageId,
  isDMUser: isDMUserProp,
  isEditingPage,
  pageVisibility,
  discovery,
  onVisibilityChange,
  onEditField,
  identityProjection,
  intelProjection,
  metadata,
  flatPages,
  blockId,
  onMetadataSaved,
  focusField,
  showIdentityEditor = false,
}: CreatureHeroSurfaceProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const envTint = resolveCreatureEnvironmentTint(
    intelProjection.habitat,
    intelProjection.region,
  );

  if (showIdentityEditor && isEditingPage && isDMUser) {
    return (
      <section className="mb-4 rounded-xl border border-border/60 bg-surface/30 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Creature identity
          </h2>
          <NarrativeVisibilityBadge
            pageVisibility={pageVisibility}
            discovery={discovery}
            isEditingPage={isEditingPage}
            onVisibilityChange={onVisibilityChange}
          />
        </div>
        <BestiaryMetadataEditor
          blockId={blockId}
          campaignHandle={campaignHandle}
          pageId={pageId}
          metadata={metadata}
          flatPages={flatPages}
          onSaved={onMetadataSaved}
          section="identity"
          bare
          focusField={focusField ?? null}
        />
        <div className="mt-4 border-t border-border/40 pt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Ecology & combat intel
          </h3>
          <BestiaryMetadataEditor
            blockId={`${blockId}:ecology`}
            campaignHandle={campaignHandle}
            pageId={pageId}
            metadata={metadata}
            flatPages={flatPages}
            onSaved={onMetadataSaved}
            section="ecology"
            bare
            focusField={focusField ?? null}
          />
        </div>
      </section>
    );
  }

  const displayName =
    intelProjection.showSilhouette && intelProjection.unidentifiedLabel
      ? intelProjection.unidentifiedLabel
      : identityProjection?.displayName?.trim() || 'Unnamed creature';

  const showPortrait =
    identityProjection?.portraitUrl && !intelProjection.showSilhouette;

  return (
    <section
      className={`creature-hero-env creature-hero-env--${envTint} relative mb-4 overflow-hidden rounded-xl border border-border/50`}
      data-env={envTint}
    >
      <div className="creature-hero-backdrop absolute inset-0 opacity-40" aria-hidden />
      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:p-6">
        <div className="shrink-0">
          {showPortrait ? (
            <img
              src={identityProjection.portraitUrl!}
              alt=""
              className="size-28 rounded-xl border border-border/60 object-cover shadow-lg sm:size-36"
            />
          ) : (
            <div className="flex size-28 items-center justify-center rounded-xl border border-dashed border-border/60 bg-surface/60 text-xs text-muted backdrop-blur-sm sm:size-36">
              {intelProjection.showSilhouette ? 'Unknown form' : 'No portrait'}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold text-focal-foreground sm:text-3xl">
                {displayName}
              </h1>
              {identityProjection?.identityLine && !intelProjection.showSilhouette ? (
                <p className="mt-0.5 text-sm font-medium text-primary/90">
                  {identityProjection.identityLine}
                </p>
              ) : null}
              {identityProjection?.alsoKnownAs && !intelProjection.showSilhouette ? (
                <p className="mt-1 text-sm italic text-muted">
                  Known as &ldquo;{identityProjection.alsoKnownAs}&rdquo;
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ThreatBadge threat={identityProjection?.threatLevel ?? null} />
              <NarrativeVisibilityBadge
                pageVisibility={pageVisibility}
                discovery={discovery}
                isEditingPage={false}
              />
            </div>
          </div>

          {identityProjection?.knownFor && !intelProjection.showSilhouette ? (
            <p className="text-sm text-foreground/80">{identityProjection.knownFor}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 text-xs">
            {identityProjection?.region ? (
              <span className="rounded-full border border-border/60 bg-surface/50 px-2 py-0.5 backdrop-blur-sm">
                {identityProjection.region}
              </span>
            ) : null}
            {intelProjection.encounterRate ? (
              <span className="rounded-full border border-border/60 bg-surface/50 px-2 py-0.5 backdrop-blur-sm">
                {intelProjection.encounterRate}
              </span>
            ) : null}
          </div>

          {isDMUser && onEditField && !isEditingPage ? (
            <button
              type="button"
              onClick={() => onEditField('creatureType')}
              className="text-xs text-primary hover:underline"
            >
              Edit creature profile
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
