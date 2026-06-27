import { META_SECTION_LABEL_CLASS, TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import { formatCharacterDisplayName } from '@/lib/characterDisplayName';
import type { PartySpotlightProjection } from '@/lib/buildPartyProjection';

interface PartySpotlightHeroProps {
  spotlight: PartySpotlightProjection;
  campaignHandle: string;
}

export function PartySpotlightHero({ spotlight, campaignHandle }: PartySpotlightHeroProps) {
  const { flatPages } = useWiki();
  const { member, quote, note, linkedPursuit } = spotlight;
  const { identity } = member;
  const { primary, pronounSuffix } = formatCharacterDisplayName(
    identity.displayName,
    identity.pronouns,
  );
  const portraitUrl = identity.portraitUrl;

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-surface/80 via-background/60 to-background/90 shadow-lg">
      <div className="grid gap-6 p-6 sm:grid-cols-[minmax(140px,200px)_1fr] sm:p-8">
        <Link
          to={campaignCategoryChildPath(
            campaignHandle,
            member.characterId,
            'Characters',
            flatPages,
          )}
          className="group relative mx-auto aspect-[3/4] w-full max-w-[200px] overflow-hidden rounded-xl border border-border bg-elevated/50 sm:mx-0"
        >
          {portraitUrl ? (
            <img
              src={portraitUrl}
              alt=""
              className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <User className="size-20 text-muted/35" strokeWidth={1} />
            </div>
          )}
        </Link>

        <div className="flex min-w-0 flex-col justify-center space-y-3">
          <div>
            <p className={META_SECTION_LABEL_CLASS}>
              In the spotlight
            </p>
            <h2 className={`mt-1 ${TYPE_DISPLAY_CLASS}`}>
              {primary}
              {pronounSuffix ? (
                <span className="ml-2 text-lg font-normal text-muted">{pronounSuffix}</span>
              ) : null}
            </h2>
            {member.cardIdentityLine ? (
              <p className="mt-1 text-sm text-muted">{member.cardIdentityLine}</p>
            ) : null}
          </div>

          {member.activeArc ? (
            <p className="text-sm text-foreground/90">
              <span className="font-medium text-muted">Active arc — </span>
              {member.activeArc}
            </p>
          ) : null}

          {quote ? (
            <blockquote className="border-l-2 border-primary/50 pl-4 font-serif text-lg italic leading-relaxed text-foreground/95">
              &ldquo;{quote}&rdquo;
            </blockquote>
          ) : null}

          {note ? (
            <p className="text-sm leading-relaxed text-muted">
              <span className="font-medium text-foreground/80">Right now — </span>
              {note}
            </p>
          ) : null}

          {linkedPursuit ? (
            <p className="text-sm">
              <Link
                to={campaignCategoryChildPath(
                  campaignHandle,
                  linkedPursuit.id,
                  'Adventure',
                  flatPages,
                )}
                className="text-primary hover:underline"
              >
                {linkedPursuit.title}
              </Link>
              <span className="ml-2 META_SECTION_LABEL_CLASS">
                {linkedPursuit.statusLabel}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
