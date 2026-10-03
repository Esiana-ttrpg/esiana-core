import { Link } from 'react-router-dom';
import { MoreHorizontal, Star } from 'lucide-react';
import type { PortfolioCharacter } from '@/types/portfolio';
import { PortfolioNoArtMark } from './PortfolioNoArtMark';

type Props = {
  character: PortfolioCharacter;
  onAction: (action: PortfolioCardAction, character: PortfolioCharacter) => void;
};

export type PortfolioCardAction =
  | 'view'
  | 'edit'
  | 'favorite'
  | 'showcase'
  | 'add-to-campaign'
  | 'duplicate'
  | 'export'
  | 'archive'
  | 'delete';

function statusLabel(character: PortfolioCharacter): string {
  if (character.derivedFilter === 'ACTIVE') {
    const current = character.adventures.find((a) => a.status === 'CURRENT');
    const title = current?.snapshot.campaignTitle;
    return title ? `Active · ${title}` : 'Active';
  }
  if (character.derivedFilter === 'PAST') return 'Past';
  return 'Unassigned';
}

function subtitle(character: PortfolioCharacter): string {
  const parts = [
    typeof character.metadata.ancestry === 'string' ? character.metadata.ancestry : null,
    character.roleLabel,
    character.levelLabel
      ? character.levelLabel.toLowerCase().startsWith('level')
        ? character.levelLabel
        : `Level ${character.levelLabel}`
      : null,
  ].filter(Boolean);
  return parts.join(' · ');
}

export function PortfolioCharacterCard({ character, onAction }: Props) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border/60 bg-surface transition-colors hover:border-border">
      <Link
        to={`/characters/${character.id}`}
        className="flex flex-1 flex-col gap-3 p-4 text-left no-underline"
      >
        <div className="flex items-start gap-3">
          <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-elevated">
            {character.portraitUrl ? (
              <img
                src={character.portraitUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <PortfolioNoArtMark name={character.name} size="card" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <h2 className="truncate font-display text-lg tracking-wide text-foreground">
                {character.name}
              </h2>
              {character.isFavorite ? (
                <Star className="mt-1 size-3.5 shrink-0 fill-current text-amber-500" aria-label="Favorite" />
              ) : null}
            </div>
            {subtitle(character) ? (
              <p className="mt-0.5 truncate text-sm text-muted">{subtitle(character)}</p>
            ) : null}
            {character.tagline ? (
              <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{character.tagline}</p>
            ) : character.biography ? (
              <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{character.biography}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <p className="truncate text-xs text-muted">
            <span
              className={
                character.derivedFilter === 'ACTIVE'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : ''
              }
            >
              ●
            </span>{' '}
            {statusLabel(character)}
          </p>
          {character.isShowcased ? (
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted">
              Showcased
            </span>
          ) : null}
        </div>
      </Link>

      <div className="absolute right-2 top-2">
        <details className="relative">
          <summary
            className="flex size-8 cursor-pointer list-none items-center justify-center rounded-md text-muted opacity-0 transition-opacity hover:bg-elevated hover:text-foreground group-hover:opacity-100 [&::-webkit-details-marker]:hidden"
            aria-label="Character actions"
          >
            <MoreHorizontal className="size-4" />
          </summary>
          <div className="absolute right-0 z-20 mt-1 min-w-44 rounded-md border border-border bg-surface py-1 shadow-lg">
            {(
              [
                ['view', 'View'],
                ['edit', 'Edit'],
                ['favorite', character.isFavorite ? 'Unfavorite' : 'Favorite'],
                [
                  'showcase',
                  character.isShowcased ? 'Remove from showcase' : 'Showcase on profile',
                ],
                ['add-to-campaign', 'Add to campaign'],
                ['duplicate', 'Duplicate'],
                ['export', 'Export'],
                ['archive', character.isArchived ? 'Unarchive' : 'Archive'],
                ['delete', 'Delete'],
              ] as const
            ).map(([action, label], index) => (
              <div key={action}>
                {(index === 2 || index === 5 || index === 8) && (
                  <div className="my-1 border-t border-border" />
                )}
                <button
                  type="button"
                  className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-elevated ${
                    action === 'delete' ? 'text-destructive' : 'text-foreground'
                  }`}
                  onClick={() => onAction(action, character)}
                >
                  {label}
                </button>
              </div>
            ))}
          </div>
        </details>
      </div>
    </article>
  );
}
