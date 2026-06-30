import { Swords } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  DASHBOARD_FACTION_CONFLICT_LIMITS,
  DASHBOARD_FACTION_CONFLICT_SORT_OPTIONS,
  normalizeFactionConflictConfig,
  type DashboardFactionConflictLimit,
  type DashboardFactionConflictSortBy,
} from '@shared/dashboardFactionConflictCatalog';
import type { FactionConflictFeedResult } from '@/lib/dashboardWidgetFeeds';
import { campaignPath } from '@/lib/campaignPaths';
import { translateDashboardWidgetLabel } from '@/i18n/dashboardWidgetLabels';
import { DashboardWidgetShell } from '../DashboardWidgetShell';
import {
  CustomizeOptionButton,
  CustomizeOptionGroup,
  DashboardWidgetCustomizeFields,
} from '../DashboardWidgetCustomizeFields';

interface FactionsAtWarWidgetProps {
  campaignHandle: string;
  feed?: FactionConflictFeedResult | null;
  customizeMode?: boolean;
  config?: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
  onHide?: () => void;
}

export function FactionsAtWarWidget({
  campaignHandle,
  feed,
  customizeMode,
  config,
  onConfigChange,
  onHide,
}: FactionsAtWarWidgetProps) {
  const { t } = useTranslation();
  const settings = normalizeFactionConflictConfig(config);
  const pairs = feed?.pairs ?? [];

  function updateConfig(patch: Partial<typeof settings>) {
    onConfigChange?.({ ...config, ...settings, ...patch });
  }

  return (
    <DashboardWidgetShell
      title={translateDashboardWidgetLabel('factionsAtWar', 'Factions at War')}
      icon={<Swords className="size-4 text-rose-400" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {customizeMode ? (
        <DashboardWidgetCustomizeFields
          category={
            <p className="text-sm text-muted">
              {t('campaign.dashboard.factionConflictCategory')}
            </p>
          }
          sort={
            <CustomizeOptionGroup>
              {DASHBOARD_FACTION_CONFLICT_SORT_OPTIONS.map((sortBy) => (
                <CustomizeOptionButton
                  key={sortBy}
                  selected={settings.sortBy === sortBy}
                  onClick={() =>
                    updateConfig({ sortBy: sortBy as DashboardFactionConflictSortBy })
                  }
                >
                  {t(`campaign.dashboard.factionConflictSort.${sortBy}`)}
                </CustomizeOptionButton>
              ))}
            </CustomizeOptionGroup>
          }
          limit={
            <CustomizeOptionGroup>
              {DASHBOARD_FACTION_CONFLICT_LIMITS.map((limit) => (
                <CustomizeOptionButton
                  key={limit}
                  selected={settings.limit === limit}
                  onClick={() => updateConfig({ limit: limit as DashboardFactionConflictLimit })}
                >
                  {limit}
                </CustomizeOptionButton>
              ))}
            </CustomizeOptionGroup>
          }
        />
      ) : pairs.length === 0 ? (
        <div className="space-y-3 text-sm text-muted">
          <p>{t('campaign.dashboard.factionConflictEmpty')}</p>
          <Link
            to={campaignPath(campaignHandle, 'relations')}
            className="font-medium text-primary hover:underline"
          >
            {t('campaign.dashboard.factionConflictOpenRelations')}
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {pairs.map((pair) => (
            <li
              key={pair.id}
              className="rounded-lg border border-border/60 px-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                <Link to={pair.factionA.href} className="text-primary hover:underline">
                  {pair.factionA.title}
                </Link>
                <Swords className="size-4 text-rose-400" aria-hidden />
                <Link to={pair.factionB.href} className="text-primary hover:underline">
                  {pair.factionB.title}
                </Link>
                {pair.mutual ? (
                  <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-rose-400">
                    {t('campaign.dashboard.factionConflictMutual')}
                  </span>
                ) : null}
              </div>
              {pair.relatedEvents.length > 0 ? (
                <ul className="mt-3 space-y-1 border-t border-border/50 pt-2">
                  {pair.relatedEvents.map((event) => (
                    <li key={event.id} className="text-xs text-muted">
                      {event.href ? (
                        <Link to={event.href} className="text-foreground hover:text-primary hover:underline">
                          {event.title}
                        </Link>
                      ) : (
                        event.title
                      )}
                      <span className="ml-2 text-[11px]">{event.timestamp}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </DashboardWidgetShell>
  );
}
