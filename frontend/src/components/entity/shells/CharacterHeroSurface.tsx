import { META_SECTION_LABEL_CLASS, TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { CharacterIdentityEditor } from '@/components/entity/CharacterIdentityEditor';
import { formatCharacterDisplayName } from '@/lib/characterDisplayName';
import type { EntityHeroProps } from '@/lib/entityPageShells/types';
import type { WikiTreeNode } from '@/types/wiki';
import { parseCharacterMetadata } from '@/lib/characterMetadata';
import { formatPartyParticipationChip } from '@shared/partyParticipation';
import {
  CharacterLifeStatusBadge,
  getCharacterLifeStatusSurfaceClass,
} from '@/components/entity/CharacterLifeStatusBadge';
import { NarrativeVisibilityBadge } from './NarrativeVisibilityBadge';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface CharacterHeroSurfaceProps extends EntityHeroProps {
  metadata: unknown;
  flatPages: WikiTreeNode[];
  blockId: string;
  onMetadataSaved: (metadata: Record<string, unknown>) => void;
  focusField?: string | null;
  /** Identity form only on Overview; other tabs keep the read-only dossier while editing. */
  showIdentityEditor?: boolean;
}

export function CharacterHeroSurface({
  campaignHandle,
  pageId,
  isDMUser: isDMUserProp,
  isEditingPage,
  pageVisibility,
  discovery,
  onVisibilityChange,
  onEditField,
  characterProjection,
  metadata,
  flatPages,
  blockId,
  onMetadataSaved,
  focusField,
  showIdentityEditor = false,
}: CharacterHeroSurfaceProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const projection = characterProjection;
  const meta = parseCharacterMetadata(metadata);
  const identityLine = meta.knownFor?.trim() || projection?.identityLine?.trim() || '';
  const partyChip = formatPartyParticipationChip(meta.partyParticipation);

  if (showIdentityEditor && isEditingPage && isDMUser) {
    return (
      <section className="mb-4 rounded-xl border border-border/60 bg-surface/30 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className={META_SECTION_LABEL_CLASS}>
            Character identity
          </h2>
          <NarrativeVisibilityBadge
            pageVisibility={pageVisibility}
            discovery={discovery}
            isEditingPage={isEditingPage}
            onVisibilityChange={onVisibilityChange}
          />
        </div>
        <CharacterIdentityEditor
          blockId={blockId}
          campaignHandle={campaignHandle}
          pageId={pageId}
          metadata={metadata}
          flatPages={flatPages}
          onSaved={onMetadataSaved}
          focusField={focusField ?? null}
        />
      </section>
    );
  }

  if (!projection?.displayName?.trim() && !projection?.portraitUrl) {
    return (
      <section className="mb-4 rounded-xl border border-dashed border-border/50 bg-surface/20 px-4 py-8 text-center text-sm text-muted">
        Identity metadata will appear here once added.
      </section>
    );
  }

  const { primary, pronounSuffix } = formatCharacterDisplayName(
    projection?.displayName ?? '',
    projection?.pronouns,
  );
  const surfaceClass = getCharacterLifeStatusSurfaceClass(
    projection?.lifeStatusVariant ?? 'alive',
  );

  return (
    <section
      className={`mb-4 rounded-xl border border-border/50 p-4 sm:p-6 ${surfaceClass}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {projection?.portraitUrl ? (
          <img
            src={projection.portraitUrl}
            alt=""
            className="size-24 shrink-0 rounded-xl border border-border object-cover sm:size-28"
          />
        ) : (
          <div className="flex size-24 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-surface/40 text-xs text-muted sm:size-28">
            No portrait
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className={TYPE_DISPLAY_CLASS}>
                {primary}
                {pronounSuffix ? (
                  <span className="ml-1.5 text-lg font-normal text-muted">
                    ({pronounSuffix})
                  </span>
                ) : null}
              </h1>
              {projection?.roleSubtitle ? (
                <p className="mt-0.5 text-sm font-medium text-primary/90">
                  {projection.roleSubtitle}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CharacterLifeStatusBadge
                status={projection?.lifeStatusVariant ?? 'alive'}
              />
              <NarrativeVisibilityBadge
                pageVisibility={pageVisibility}
                discovery={discovery}
                isEditingPage={false}
              />
            </div>
          </div>

          {identityLine ? (
            <p className="text-sm italic text-muted">&ldquo;{identityLine}&rdquo;</p>
          ) : null}

          {partyChip || projection?.affiliationTitle || projection?.familyTitle ? (
            <div className="flex flex-wrap gap-2 text-xs">
              {partyChip ? (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 font-semibold uppercase tracking-wide text-primary">
                  {partyChip}
                </span>
              ) : null}
              {projection.affiliationTitle ? (
                <span className="rounded-full border border-border/60 bg-surface/50 px-2 py-0.5">
                  {projection.affiliationTitle}
                </span>
              ) : null}
              {(projection.familyTitle ?? projection.ancestry) ? (
                <span className="rounded-full border border-border/60 bg-surface/50 px-2 py-0.5">
                  {projection.familyTitle ?? projection.ancestry}
                </span>
              ) : null}
              {projection.statusLabel ? (
                <span className="rounded-full border border-border/60 bg-surface/50 px-2 py-0.5">
                  {projection.statusLabel}
                </span>
              ) : null}
            </div>
          ) : null}

          {isDMUser && onEditField && !isEditingPage ? (
            <button
              type="button"
              onClick={() => onEditField('title')}
              className="text-xs text-primary hover:underline"
            >
              Edit identity
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
