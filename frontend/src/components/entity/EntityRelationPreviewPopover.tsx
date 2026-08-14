import type { EntityPreviewBase, EntityPreviewProjection } from '@/lib/entityPreview';
import { formatCharacterDisplayName } from '@/lib/characterDisplayName';
import { ENTITY_EMPTY_COPY } from '@/lib/entityEmptyCopy';
import { CharacterLifeStatusBadge } from './CharacterLifeStatusBadge';

interface EntityRelationPreviewPopoverProps {
  base: EntityPreviewBase | null;
  projection: EntityPreviewProjection | null;
  loading?: boolean;
}

export function EntityRelationPreviewPopover({
  base,
  projection,
  loading = false,
}: EntityRelationPreviewPopoverProps) {
  const isCharacter = base?.surfaceProfileKey === 'character';
  const displayName = base
    ? formatCharacterDisplayName(base.title, base.pronouns)
    : null;

  return (
    <div
      role="tooltip"
      className={`absolute left-0 top-full z-50 mt-1 min-w-[200px] max-w-[280px] rounded-lg border border-border bg-background p-3 shadow-lg ${projection?.lifeStatusVariant === 'DECEASED' ? 'opacity-90 saturate-[0.75]' : ''}`}
    >
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : !base ? (
        <p className="text-sm text-muted">Preview unavailable.</p>
      ) : (
        <div className="space-y-2">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-semibold leading-tight">
                {displayName?.primary}
                {displayName?.pronounSuffix ? (
                  <span className="ml-1 font-normal text-muted">
                    ({displayName.pronounSuffix})
                  </span>
                ) : null}
              </p>
              {projection?.lifeStatusVariant ? (
                <CharacterLifeStatusBadge
                  status={projection.lifeStatusVariant}
                  compact
                />
              ) : null}
            </div>
            {isCharacter && base.identitySubtitle ? (
              <p className="mt-0.5 text-xs text-muted">{base.identitySubtitle}</p>
            ) : null}
            {base.motto ? (
              <p className="mt-0.5 text-xs italic text-muted">&ldquo;{base.motto}&rdquo;</p>
            ) : null}
          </div>

          {isCharacter && base.knownFor ? (
            <p className="text-xs italic text-muted leading-snug">
              <span className="font-medium not-italic text-foreground">Known for:</span>{' '}
              {base.knownFor}
            </p>
          ) : null}

          {isCharacter && base.appearanceSummary ? (
            <p className="text-xs text-muted leading-snug">{base.appearanceSummary}</p>
          ) : null}

          {projection?.connectedThrough?.length ? (
            <div className="text-xs text-muted">
              <span className="font-medium text-foreground">Connected through:</span>
              <ul className="mt-0.5 list-inside list-disc">
                {projection.connectedThrough.map((entry) => (
                  <li key={`${entry.kind}-${entry.label}`}>{entry.label}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {base.leaderTitle ? (
            <p className="text-xs text-muted">
              <span className="font-medium text-foreground">Leader:</span> {base.leaderTitle}
            </p>
          ) : null}
          {base.headTitle ? (
            <p className="text-xs text-muted">
              <span className="font-medium text-foreground">Head:</span> {base.headTitle}
            </p>
          ) : null}
          {projection?.resolvedStance ? (
            <p className="text-xs">
              <span className="font-medium">Stance:</span> {projection.resolvedStance}
              {projection.relationType ? ` (${projection.relationType})` : ''}
            </p>
          ) : null}
          {projection?.currentAffiliations?.length ? (
            <div className="text-xs text-muted">
              <span className="font-medium text-foreground">Affiliations:</span>
              <ul className="mt-0.5 list-inside list-disc">
                {projection.currentAffiliations.map((aff) => (
                  <li key={`${aff.orgTitle}-${aff.role}`}>
                    {aff.orgTitle}
                    {aff.role ? ` — ${aff.role}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {projection?.overflowSegments?.length ? (
            <p className="text-xs text-muted">
              <span className="font-medium text-foreground">More:</span>{' '}
              {projection.overflowSegments.join(' • ')}
            </p>
          ) : null}
          {projection?.temporalBadges?.length ? (
            <div className="flex flex-wrap gap-1">
              {projection.temporalBadges.map((badge) => (
                <span
                  key={badge.label}
                  className="inline-flex items-center rounded-full border border-border bg-surface/60 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted"
                >
                  {badge.label}
                </span>
              ))}
            </div>
          ) : null}
          {!isCharacter ? (
            <p className="text-xs text-muted leading-snug">
              {projection?.timelineNote?.trim() || ENTITY_EMPTY_COPY.previewNote}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
