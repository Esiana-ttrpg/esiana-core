import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageContainer, PagePanel } from '@/components/layout/PageContainer';
import { PageShell, SHOWCASE_MAX_WIDTH_CLASS } from '@/components/layout/PageShell';
import { CampaignPresenceCard } from '@/components/campaign-presence/CampaignPresenceCard';
import { fetchRecruitmentDirectory } from '@/lib/campaigns';
import { GAME_SYSTEM_CATEGORIES, GAME_SYSTEMS } from '@shared/gameSystems';
import { isLobbyTableFull } from '@shared/recruitmentSeats';
import { CampaignThemeFilterDropdown } from '@/components/recruitment/CampaignThemeFilterDropdown';
import { PlatformGuideLinks } from '@/components/guides/PlatformGuideLinks';
import { RECRUITMENT_DIRECTORY_GUIDE_SLUGS } from '@/lib/platformGuides';
import type { PublicDirectoryCampaign } from '@/types/recruitment';

type SortMode = 'newest' | 'next-session';

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function parseWeekday(input: string | null | undefined): number | null {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  if (normalized in WEEKDAY_INDEX) return WEEKDAY_INDEX[normalized];
  const key = Object.keys(WEEKDAY_INDEX).find((day) => day.startsWith(normalized));
  return key ? WEEKDAY_INDEX[key] : null;
}

function parseTime(input: string | null | undefined): { hour: number; minute: number } | null {
  if (!input) return null;
  const normalized = input.trim().toLowerCase();
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = Number.parseInt(match[1] ?? '', 10);
  const minute = Number.parseInt(match[2] ?? '0', 10);
  const meridiem = match[3];
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) {
    return null;
  }
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;
  return { hour, minute };
}

function inferCadenceDays(input: string | null | undefined): number {
  const text = (input ?? '').toLowerCase();
  if (text.includes('biweekly') || text.includes('bi-weekly') || text.includes('every 2 week')) {
    return 14;
  }
  if (text.includes('monthly') || text.includes('month')) return 30;
  return 7;
}

function nextSessionDate(campaign: PublicDirectoryCampaign): Date | null {
  const r = campaign.recruitment;
  const weekday = parseWeekday(r.scheduleDay);
  const time = parseTime(r.scheduleTime);
  if (weekday === null || !time) return null;
  const cadenceDays = inferCadenceDays(r.scheduleFrequency);
  const now = new Date();
  const first = new Date(now);
  first.setHours(time.hour, time.minute, 0, 0);
  const dayOffset = (weekday - first.getDay() + 7) % 7;
  first.setDate(first.getDate() + dayOffset);
  if (first <= now) first.setDate(first.getDate() + cadenceDays);
  return first;
}

export function RecruitmentDirectoryPage() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<PublicDirectoryCampaign[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [gameSystem, setGameSystem] = useState('');
  const [genreThemeFilters, setGenreThemeFilters] = useState<string[]>([]);
  const [hideFullGames, setHideFullGames] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  useEffect(() => {
    void (async () => {
      const data = await fetchRecruitmentDirectory({
        page,
        limit: 12,
        gameSystem: gameSystem || undefined,
        genreThemes: genreThemeFilters.length > 0 ? genreThemeFilters : undefined,
      });
      setCampaigns(data.campaigns);
      setTotalPages(data.pagination.totalPages);
    })();
  }, [page, gameSystem, genreThemeFilters]);

  const filterSystems = useMemo(
    () =>
      GAME_SYSTEM_CATEGORIES.flatMap((category) =>
        GAME_SYSTEMS.filter((entry) => entry.category === category && entry.slug !== 'other'),
      ),
    [],
  );

  const renderedCampaigns = useMemo(() => {
    let list = [...campaigns];
    if (hideFullGames) {
      list = list.filter(
        (c) =>
          !isLobbyTableFull(c.recruitment.filledSeats, {
            maxSeats: c.recruitment.maxSeats,
            maxPlayers: c.recruitment.maxPlayers,
          }),
      );
    }
    if (sortMode === 'newest') {
      list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    } else {
      list.sort((a, b) => {
        const aDate = nextSessionDate(a);
        const bDate = nextSessionDate(b);
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return aDate.getTime() - bDate.getTime();
      });
    }
    return list;
  }, [campaigns, hideFullGames, sortMode]);

  return (
    <PageContainer>
      <PageShell
        width="wide"
        className={`${SHOWCASE_MAX_WIDTH_CLASS} flex flex-col gap-6`}
      >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('campaign.recruitment.pageTitle')}</h1>
          <p className="mt-1 text-sm text-muted">{t('campaign.recruitment.pageSubtitle')}</p>
        </div>
        <PlatformGuideLinks slugs={RECRUITMENT_DIRECTORY_GUIDE_SLUGS} />
      </div>

      <PagePanel className="flex flex-wrap items-end gap-3 p-4">
        <label className="flex min-w-[180px] flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted">
            {t('campaign.recruitment.filterGameSystem')}
          </span>
          <select
            value={gameSystem}
            onChange={(e) => {
              setPage(1);
              setGameSystem(e.target.value);
            }}
            className="h-10 rounded border border-border bg-background px-3 text-sm text-foreground"
          >
            <option value="">{t('campaign.recruitment.filterAllSystems')}</option>
            {GAME_SYSTEM_CATEGORIES.map((category) => {
              const entries = filterSystems.filter((entry) => entry.category === category);
              if (entries.length === 0) return null;
              return (
                <optgroup key={category} label={category}>
                  {entries.map((entry) => (
                    <option key={entry.slug} value={entry.slug}>
                      {entry.label}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </label>

        <CampaignThemeFilterDropdown
          selectedSlugs={genreThemeFilters}
          onChange={(slugs) => {
            setPage(1);
            setGenreThemeFilters(slugs);
          }}
        />

        <label className="flex min-w-[180px] flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted">
            {t('campaign.recruitment.filterSeatsAvailable')}
          </span>
          <select
            value={hideFullGames ? 'open-only' : 'all'}
            onChange={(e) => setHideFullGames(e.target.value === 'open-only')}
            className="h-10 rounded border border-border bg-background px-3 text-sm text-foreground"
          >
            <option value="all">{t('campaign.recruitment.filterShowAllGames')}</option>
            <option value="open-only">{t('campaign.recruitment.filterHideFullGames')}</option>
          </select>
        </label>

        <label className="flex min-w-[180px] flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted">
            {t('campaign.recruitment.filterSortBy')}
          </span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="h-10 rounded border border-border bg-background px-3 text-sm text-foreground"
          >
            <option value="newest">{t('campaign.recruitment.sortNewest')}</option>
            <option value="next-session">{t('campaign.recruitment.sortNextSession')}</option>
          </select>
        </label>
      </PagePanel>

      <hr className="my-6 border-border" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {renderedCampaigns.map((campaign) => (
          <CampaignPresenceCard
            key={campaign.id}
            campaign={campaign}
            variant="directory"
          />
        ))}
      </div>
      <div className="flex items-center justify-center gap-3">
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded border border-border px-3 py-1 text-sm text-foreground disabled:opacity-50">{t('campaign.recruitment.paginationPrev')}</button>
        <span className="text-sm text-muted">{t('campaign.recruitment.paginationLabel', { page, totalPages })}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded border border-border px-3 py-1 text-sm text-foreground disabled:opacity-50">{t('campaign.recruitment.paginationNext')}</button>
      </div>
      </PageShell>
    </PageContainer>
  );
}
