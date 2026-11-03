import { Link } from 'react-router-dom';
import type { ActiveCampaignSummary, PersonalStatisticsRangeMode } from '@shared/statsTypes';
import { buildCampaignGradientStyle } from '@/lib/campaignCardPresentation';
import {
  HUB_ARTWORK_FOREGROUND,
  HUB_ARTWORK_FOREGROUND_MUTED,
} from '@/lib/buildCampaignWorldPresentation';
import { TYPE_META_CLASS } from '@/lib/surfaceLayout';
import { StatsSectionHeader } from './StatsChartFrame';

function periodHeadingKey(mode: PersonalStatisticsRangeMode): string {
  if (mode === 'year') return 'profile.creatorstats.activeCampaignsTitleYear';
  if (mode === 'all_time') return 'profile.creatorstats.activeCampaignsTitleAllTime';
  if (mode === 'custom') return 'profile.creatorstats.activeCampaignsTitleCustom';
  return 'profile.creatorstats.activeCampaignsTitleMonth';
}

export function ActiveCampaignsSection({
  campaigns,
  rangeMode,
  t,
}: {
  campaigns: ActiveCampaignSummary[];
  rangeMode: PersonalStatisticsRangeMode;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (campaigns.length === 0) return null;

  return (
    <section className="space-y-4">
      <StatsSectionHeader
        category="campaigns"
        title={t(periodHeadingKey(rangeMode))}
        help={t('profile.creatorstats.activeCampaignsHelp')}
      />
      <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
        {campaigns.map((campaign) => {
          const fallback = buildCampaignGradientStyle(campaign.handle || campaign.id);
          return (
            <li
              key={campaign.id}
              className="min-w-[14.5rem] flex-1 sm:min-w-0"
            >
              <Link
                to={campaign.href}
                className="group relative block h-44 overflow-hidden rounded-lg border border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {campaign.coverImageUrl ? (
                  <img
                    src={campaign.coverImageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="absolute inset-0" style={fallback} aria-hidden />
                )}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent"
                  aria-hidden
                />
                <div
                  className="relative flex h-full flex-col justify-end gap-1 p-3"
                  style={{ color: HUB_ARTWORK_FOREGROUND }}
                >
                  <p className="line-clamp-2 text-base font-medium leading-snug">
                    {campaign.name}
                  </p>
                  <p
                    className={TYPE_META_CLASS}
                    style={{ color: HUB_ARTWORK_FOREGROUND_MUTED }}
                  >
                    {t('profile.creatorstats.activeCampaignsContributions', {
                      count: campaign.contributions,
                    })}
                  </p>
                  <p
                    className={TYPE_META_CLASS}
                    style={{ color: HUB_ARTWORK_FOREGROUND_MUTED }}
                  >
                    {t('profile.creatorstats.activeCampaignsMeta', {
                      pages: campaign.pagesTouched,
                      days: campaign.activeDays,
                    })}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
