import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { campaignCategoryChildPath } from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import { formatCharacterDisplayName } from '@/lib/characterDisplayName';
import type { PartyMemberProjection } from '@/lib/buildPartyProjection';

interface PartyMemberPortraitCardProps {
  member: PartyMemberProjection;
  campaignHandle: string;
  compact?: boolean;
}

export function PartyMemberPortraitCard({
  member,
  campaignHandle,
  compact = false,
}: PartyMemberPortraitCardProps) {
  const { flatPages } = useWiki();
  const { identity } = member;
  const { primary, pronounSuffix } = formatCharacterDisplayName(
    identity.displayName,
    identity.pronouns,
  );
  const portraitUrl = identity.portraitUrl;
  const href = campaignCategoryChildPath(
    campaignHandle,
    member.characterId,
    'Characters',
    flatPages,
  );

  return (
    <Link
      to={href}
      className={`group flex shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-surface/50 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 ${
        compact ? 'w-40' : 'w-44 sm:w-48'
      }`}
    >
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-b from-elevated/80 to-background/90 ${
          compact ? 'aspect-[3/4]' : 'aspect-[3/4.2]'
        }`}
      >
        {portraitUrl ? (
          <img
            src={portraitUrl}
            alt=""
            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <User className="size-16 text-muted/40" strokeWidth={1.25} />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/95 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div>
          <p className="truncate font-semibold leading-tight text-foreground">
            {primary}
            {pronounSuffix ? (
              <span className="ml-1 font-normal text-muted">{pronounSuffix}</span>
            ) : null}
          </p>
          {member.cardIdentityLine ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted">
              {member.cardIdentityLine}
            </p>
          ) : null}
          <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {member.partyRoleLabel}
          </span>
        </div>

        {identity.knownFor ? (
          <p className="line-clamp-2 text-[11px] italic leading-snug text-foreground/80">
            {identity.knownFor}
          </p>
        ) : null}

        {member.activeArc ? (
          <p className="line-clamp-2 text-[11px] leading-snug text-primary/90">
            {member.activeArc}
          </p>
        ) : null}

        {!compact && member.motivation ? (
          <p className="line-clamp-2 text-[10px] leading-snug text-muted">
            {member.motivation}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
