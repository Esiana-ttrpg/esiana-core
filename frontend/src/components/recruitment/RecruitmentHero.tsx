import type { PublicDirectoryCampaign } from '@/types/recruitment';
import { RecruitmentMetaChips } from './RecruitmentMetaChips';
import { getContinuityLine } from './recruitmentContinuity';

interface RecruitmentHeroProps {
  campaign: PublicDirectoryCampaign;
}

export function RecruitmentHero({ campaign }: RecruitmentHeroProps) {
  const continuity = getContinuityLine(campaign);
  const tagline = campaign.recruitmentTagline?.trim();
  const cover = campaign.heroImageUrl?.trim();

  return (
    <header className="overflow-hidden rounded-2xl border border-border/80">
      <div
        className="relative min-h-[220px] bg-gradient-to-br from-surface via-elevated to-background px-6 py-10 sm:min-h-[260px] sm:px-10 sm:py-14 lg:px-12 lg:py-16"
        style={
          cover
            ? {
                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.85)), url(${cover})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          {campaign.name}
        </h1>
        {tagline ? (
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-foreground/90 sm:text-xl">
            {tagline}
          </p>
        ) : null}
        <div className="mt-5">
          <RecruitmentMetaChips campaign={campaign} />
        </div>
        {continuity ? (
          <p className="mt-4 text-sm font-medium text-primary/90">{continuity}</p>
        ) : null}
      </div>
    </header>
  );
}
