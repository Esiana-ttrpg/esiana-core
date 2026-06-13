import type { PublicDirectoryCampaign } from '@/types/recruitment';
import { getCampaignThemeLabel } from '@/components/campaign/CampaignThemeMultiSelect';

interface RecruitmentMetaChipsProps {
  campaign: PublicDirectoryCampaign;
  compact?: boolean;
}

function Chip({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'primary' | 'muted' }) {
  const classes =
    tone === 'primary'
      ? 'border-primary/40 bg-primary/10 text-primary'
      : tone === 'muted'
        ? 'border-border bg-background/60 text-muted'
        : 'border-border bg-surface text-foreground';
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs ${classes}`}>
      {children}
    </span>
  );
}

export function RecruitmentMetaChips({ campaign, compact = false }: RecruitmentMetaChipsProps) {
  const r = campaign.recruitment;
  const settings = campaign.recruitmentSettings;
  const format = settings?.campaignFormat ?? settings?.type ?? campaign.campaignFormat;
  const experience = settings?.experienceRequired ?? campaign.experienceRequired;
  const language = settings?.language ?? campaign.language;
  const tableStyles = campaign.tableStyleLabels ?? campaign.tableStyleTags ?? [];
  const genres = r.genreThemeLabels ?? r.genreThemes;

  const primaryRow = [
    campaign.gameSystemLabel ? <Chip key="system">{campaign.gameSystemLabel}</Chip> : null,
    format ? <Chip key="format">{format}</Chip> : null,
    experience ? <Chip key="exp">{experience}</Chip> : null,
    language ? <Chip key="lang">{language}</Chip> : null,
  ].filter(Boolean);

  const scheduleLine = [
    r.scheduleFrequency,
    r.scheduleDay,
    r.scheduleTime ? `at ${r.scheduleTime}` : null,
    r.scheduleTimezone ? `(${r.scheduleTimezone})` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {primaryRow.length > 0 ? (
        <div className="flex flex-wrap gap-2">{primaryRow}</div>
      ) : null}
      {scheduleLine ? (
        <p className={`text-foreground/90 ${compact ? 'text-xs' : 'text-sm'}`}>{scheduleLine}</p>
      ) : null}
      {tableStyles.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tableStyles.map((tag) => (
            <Chip key={tag} tone="primary">
              {tag}
            </Chip>
          ))}
        </div>
      ) : null}
      {!compact && genres.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {genres.map((theme, index) => (
            <Chip key={theme} tone="muted">
              {r.genreThemeLabels?.[index] ?? getCampaignThemeLabel(theme)}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
}
