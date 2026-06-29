import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { PublicDirectoryCampaign } from '@/types/recruitment';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { getContinuityLine } from '@/components/recruitment/recruitmentContinuity';
import { getRecruitmentListingTeaser } from '@/lib/recruitmentListingTeaser';
import { buildCampaignGradientStyle } from '@/lib/campaignCardPresentation';
import {
  buildCultureChips,
  buildMetadataLine,
  buildScheduleLine,
  buildTableSocialState,
} from '@/lib/campaignPresence';
import { RecruitmentIntegrationIcons } from '@/components/recruitment/RecruitmentIntegrationIcons';
import { TableSeatRow } from './TableSeatRow';

export type CampaignPresenceVariant = 'featured' | 'directory';

interface CampaignPresenceCardProps {
  campaign: PublicDirectoryCampaign;
  variant: CampaignPresenceVariant;
  cta?: { label: string; href: string };
}

const DEFAULT_CTA_KEY = {
  featured: 'campaign.recruitment.enterLobby',
  directory: 'campaign.recruitment.viewLobby',
} as const;

export function CampaignPresenceCard({
  campaign,
  variant,
  cta,
}: CampaignPresenceCardProps) {
  const { t } = useTranslation();
  const r = campaign.recruitment;
  const lobbyHref = `/recruitment/${campaign.handle}`;
  const resolvedCta = {
    label: cta?.label ?? t(DEFAULT_CTA_KEY[variant]),
    href: cta?.href || lobbyHref,
  };

  const cover = campaign.heroImageUrl?.trim();
  const gradientStyle = buildCampaignGradientStyle(campaign.handle || campaign.id);
  const teaser = getRecruitmentListingTeaser(campaign);
  const continuity = getContinuityLine(campaign);
  const metadataLine = buildMetadataLine(campaign);
  const cultureChips = buildCultureChips(campaign);
  const scheduleLine = buildScheduleLine(campaign);
  const social = buildTableSocialState(campaign);
  const tablePlayers = r.tablePlayers ?? [];

  const heroHeight = variant === 'featured' ? 'h-28' : 'h-24';
  const titleOnHero = variant === 'featured';
  const cardPadding = variant === 'directory' ? 'p-6' : 'p-4';
  const titleClass =
    variant === 'featured'
      ? 'line-clamp-2 text-base font-semibold text-foreground drop-shadow-sm'
      : 'text-xl font-semibold text-foreground';

  const heroStyle = cover
    ? {
        backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.75)), url(${cover})`,
        backgroundSize: 'cover' as const,
        backgroundPosition: 'center' as const,
      }
    : gradientStyle;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface/90 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10">
      <div
        className={`relative shrink-0 bg-gradient-to-br from-surface via-elevated to-background ${heroHeight}`}
        style={heroStyle}
      >
        {titleOnHero ? (
          <div className="absolute inset-x-0 bottom-0 p-3">
            <h3 className={titleClass}>{campaign.name}</h3>
          </div>
        ) : null}
      </div>

      <div className={`flex flex-1 flex-col ${cardPadding}`}>
        {campaign.host ? (
          <div className="mb-2 flex items-center gap-2">
            <UserAvatar
              name={campaign.host.label}
              avatarUrl={campaign.host.avatarUrl}
              userId={campaign.host.id}
              size="sm"
            />
            <Link
              to={`/users/${campaign.host.id}`}
              className="text-xs text-muted transition-colors hover:text-primary"
            >
              {campaign.host.label}
            </Link>
          </div>
        ) : null}

        {!titleOnHero ? <h2 className={titleClass}>{campaign.name}</h2> : null}

        {teaser ? (
          <p
            className={`line-clamp-2 leading-relaxed text-foreground/90 ${
              titleOnHero ? 'text-sm' : 'mt-2 text-sm'
            }`}
          >
            {teaser}
          </p>
        ) : null}

        {continuity ? (
          <p className="mt-1 text-xs font-medium text-primary/90">{continuity}</p>
        ) : null}

        {metadataLine ? (
          <p className="mt-2 text-xs text-muted">{metadataLine}</p>
        ) : null}

        {cultureChips.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {cultureChips.map((chip) => (
              <span
                key={chip}
                className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}

        {r.integrationProviders.length > 0 ? (
          <div className={cultureChips.length > 0 ? 'mt-2' : 'mt-3'}>
            <RecruitmentIntegrationIcons providers={r.integrationProviders} />
          </div>
        ) : null}

        <p
          className={`text-sm text-foreground ${
            cultureChips.length > 0 || r.integrationProviders.length > 0 ? 'mt-2' : 'mt-3'
          }`}
        >
          {scheduleLine}
        </p>

        <div className={`space-y-2 ${variant === 'directory' ? 'mt-6 border-t border-border pt-4' : 'mt-4'}`}>
          <p className="text-sm font-medium text-foreground">{social.headline}</p>

          <TableSeatRow
            tablePlayers={tablePlayers}
            filledSeats={r.filledSeats}
            maxSeats={r.maxSeats}
            maxPlayers={r.maxPlayers}
            isFull={r.isFull}
            ariaLabel={social.ariaLabel}
          />
        </div>

        <div className="mt-auto pt-4">
          <Link
            to={resolvedCta.href}
            className={
              variant === 'featured'
                ? 'inline-flex w-full items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-background transition-colors hover:bg-primary-hover'
                : 'inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-background transition hover:bg-primary-hover'
            }
          >
            {resolvedCta.label}
          </Link>
        </div>
      </div>
    </article>
  );
}
