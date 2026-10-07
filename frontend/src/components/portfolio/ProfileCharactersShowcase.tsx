import { Link } from 'react-router-dom';
import type { PublicPortfolioCharacterProjection } from '@shared/portfolioCharacter';
import { PortfolioNoArtMark } from '@/components/portfolio/PortfolioNoArtMark';
import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';

type Props = {
  ownerUserId: string;
  ownerLabel: string;
  characters: PublicPortfolioCharacterProjection[];
  isSelf?: boolean;
};

export function ProfileCharactersShowcase({
  ownerUserId,
  ownerLabel,
  characters,
  isSelf,
}: Props) {
  if (characters.length === 0) {
    if (!isSelf) return null;
    return (
      <section className="space-y-3">
        <h2 className={META_SECTION_LABEL_CLASS}>{ownerLabel}&apos;s Characters</h2>
        <p className="text-sm text-muted">
          No characters showcased yet.{' '}
          <Link to="/characters/manage" className="text-primary hover:underline">
            Manage showcase
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className={META_SECTION_LABEL_CLASS}>
          {ownerLabel}&apos;s Characters
        </h2>
        {isSelf ? (
          <Link to="/characters/manage" className="text-sm text-muted hover:text-foreground">
            Manage showcase
          </Link>
        ) : null}
      </div>

      <div className="space-y-4">
        {characters.map((c) => (
          <Link
            key={c.id}
            to={`/users/${ownerUserId}/characters/${c.id}`}
            className="flex gap-4 rounded-xl border border-border/60 bg-surface p-4 transition-colors hover:border-border no-underline"
          >
            <div className="size-28 shrink-0 overflow-hidden rounded-lg bg-elevated">
              {c.portraitUrl ? (
                <img src={c.portraitUrl} alt="" className="size-full object-cover" />
              ) : (
                <PortfolioNoArtMark name={c.name} size="showcase" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-xl tracking-wide text-foreground">{c.name}</p>
              <p className="mt-1 text-sm text-muted">
                {[c.ancestry, c.roleLabel, c.levelLabel].filter(Boolean).join(' · ')}
              </p>
              {c.tagline ? (
                <p className="mt-2 text-sm italic text-foreground/85">{c.tagline}</p>
              ) : c.biographyExcerpt ? (
                <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{c.biographyExcerpt}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted">
                  {c.adventureBlurb?.currentlyAdventuring
                    ? c.adventureBlurb.campaignTitle
                      ? `${c.adventureBlurb.campaignTitle} · Currently adventuring`
                      : c.adventureBlurb.genericLabel ?? 'Currently adventuring'
                    : 'Looking for an adventure'}
                </p>
                <span className="text-sm text-primary">View →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
