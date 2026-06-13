import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import {
  presenceTierLabel,
  type CharacterCastEntryProps as CastEntryViewModel,
} from '@/lib/characterCastProjection';
import { formatCharacterDisplayName } from '@/lib/characterDisplayName';
import { CharacterLifeStatusBadge } from '@/components/entity/CharacterLifeStatusBadge';
import type { CharacterLifeStatus } from '@/lib/characterMetadata';

interface CharacterCastEntryComponentProps {
  campaignHandle: string;
  entry: CastEntryViewModel;
  selected: boolean;
  onSelect: (characterId: string) => void;
  pronouns?: string | null;
}

export function CharacterCastEntry({
  campaignHandle,
  entry,
  selected,
  onSelect,
  pronouns,
}: CharacterCastEntryComponentProps) {
  const { flatPages } = useWiki();
  const displayName = formatCharacterDisplayName(entry.title, pronouns);
  const profileHref = campaignCategoryChildPath(
    campaignHandle,
    entry.id,
    'Characters',
    flatPages,
  );
  const presenceLabel = presenceTierLabel(
    entry.presenceTier,
    entry.mentionedInLatestSession,
  );
  const isActive =
    entry.presenceTier === 'active' || entry.mentionedInLatestSession;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(entry.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(entry.id);
        }
      }}
      className={`group flex min-w-0 cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
        selected
          ? 'border-primary/50 bg-primary/10'
          : 'border-border bg-focal-surface/40 hover:border-primary/30 hover:bg-focal-elevated/60'
      }`}
      aria-pressed={selected}
    >
      <Link
        to={profileHref}
        onClick={(event) => event.stopPropagation()}
        className="relative shrink-0 overflow-hidden rounded-md border border-border bg-elevated/60"
        aria-label={`Open ${displayName.ariaLabel} profile`}
      >
        <div className="flex size-14 items-center justify-center sm:size-16">
          {entry.portraitUrl ? (
            <img
              src={entry.portraitUrl}
              alt=""
              className="size-full object-cover object-top"
            />
          ) : (
            <User className="size-7 text-muted/50" strokeWidth={1.25} />
          )}
        </div>
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            to={profileHref}
            onClick={(event) => event.stopPropagation()}
            className="truncate font-semibold text-focal-foreground hover:text-primary"
          >
            {displayName.primary}
            {displayName.pronounSuffix ? (
              <span className="ml-1 text-sm font-normal text-muted">
                ({displayName.pronounSuffix})
              </span>
            ) : null}
          </Link>
          {entry.isPartyMember ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {entry.partyRoleLabel ?? 'Party'}
            </span>
          ) : null}
          <CharacterLifeStatusBadge
            status={entry.lifeStatus as CharacterLifeStatus}
            compact
          />
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${
              isActive ? 'text-emerald-400' : 'text-muted'
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                isActive ? 'bg-emerald-400' : 'bg-muted/60'
              }`}
            />
            {presenceLabel}
          </span>
        </div>

        {entry.identityLine ? (
          <p className="mt-0.5 truncate text-xs text-muted">{entry.identityLine}</p>
        ) : null}

        <div className="mt-2 space-y-1 text-xs text-focal-muted">
          {entry.knownThroughLabel ? (
            <p className="min-w-0 truncate">
              <span className="text-muted">Known Through: </span>
              {entry.knownThroughHref ? (
                <Link
                  to={entry.knownThroughHref}
                  onClick={(event) => event.stopPropagation()}
                  className="font-medium text-focal-foreground hover:text-primary"
                >
                  {entry.knownThroughLabel}
                </Link>
              ) : (
                <span className="font-medium text-focal-foreground">
                  {entry.knownThroughLabel}
                </span>
              )}
            </p>
          ) : null}
          {entry.activeQuests.length > 0 ? (
            <p className="min-w-0 truncate">
              <span className="text-muted">Active In: </span>
              {entry.activeQuests.slice(0, 2).map((quest, index) => (
                <span key={quest.id}>
                  {index > 0 ? ', ' : null}
                  <Link
                    to={quest.href}
                    onClick={(event) => event.stopPropagation()}
                    className="font-medium text-focal-foreground hover:text-primary"
                  >
                    {quest.title}
                  </Link>
                </span>
              ))}
              {entry.activeQuests.length > 2 ? (
                <span className="text-muted"> +{entry.activeQuests.length - 2}</span>
              ) : null}
            </p>
          ) : null}
          {entry.lastSeenLabel ? (
            <p className="min-w-0 truncate">
              <span className="text-muted">Last Seen: </span>
              {entry.lastSeenHref ? (
                <Link
                  to={entry.lastSeenHref}
                  onClick={(event) => event.stopPropagation()}
                  className="font-medium text-focal-foreground hover:text-primary"
                >
                  {entry.lastSeenLabel}
                </Link>
              ) : (
                <span className="font-medium text-focal-foreground">
                  {entry.lastSeenLabel}
                </span>
              )}
            </p>
          ) : null}
          {entry.coSeenWith.length > 0 ? (
            <p className="min-w-0 truncate">
              <span className="text-muted">With: </span>
              {entry.coSeenWith.map((peer, index) => (
                <span key={peer.id}>
                  {index > 0 ? ', ' : null}
                  <Link
                    to={campaignCategoryChildPath(
                      campaignHandle,
                      peer.id,
                      'Characters',
                      flatPages,
                    )}
                    onClick={(event) => event.stopPropagation()}
                    className="font-medium text-focal-foreground hover:text-primary"
                  >
                    {peer.title}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
          {entry.memorySnippet ? (
            <p className="min-w-0 truncate italic text-focal-muted/90">
              &ldquo;{entry.memorySnippet}&rdquo;
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
