import { Globe2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  DASHBOARD_WORLD_EVENT_LIMITS,
  DASHBOARD_WORLD_EVENT_SORT_OPTIONS,
  DASHBOARD_WORLD_EVENT_TYPES,
  normalizeWorldEventsConfig,
  type DashboardWorldEventLimit,
  type DashboardWorldEventSortBy,
  type DashboardWorldEventType,
} from '@shared/dashboardWorldEventsCatalog';
import { WORLD_EVENT_TYPE_EMOJI } from '@shared/worldEventWidgetPresentation';
import type { DashboardWorldEventsFeedResult } from '@/lib/dashboardWidgetFeeds';
import { campaignChronologyPath } from '@/lib/campaignPaths';
import { translateDashboardWidgetLabel } from '@/i18n/dashboardWidgetLabels';
import {
  worldEventSortLabelKey,
  worldEventTypeLabelKey,
} from '@/i18n/dashboardCustomizeLabels';
import { DashboardWidgetShell } from '../DashboardWidgetShell';
import {
  CustomizeOptionButton,
  CustomizeOptionGroup,
  DashboardWidgetCustomizeFields,
} from '../DashboardWidgetCustomizeFields';

interface WorldEventsWidgetProps {
  campaignHandle: string;
  feed?: DashboardWorldEventsFeedResult | null;
  customizeMode?: boolean;
  config?: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
  onHide?: () => void;
}

export function WorldEventsWidget({
  campaignHandle,
  feed,
  customizeMode,
  config,
  onConfigChange,
  onHide,
}: WorldEventsWidgetProps) {
  const { t } = useTranslation();
  const settings = normalizeWorldEventsConfig(config);
  const items = feed?.items ?? [];

  function updateConfig(patch: Partial<typeof settings>) {
    onConfigChange?.({ ...config, ...settings, ...patch });
  }

  function toggleType(type: DashboardWorldEventType) {
    const current = new Set(settings.typeFilters);
    if (current.has(type)) {
      current.delete(type);
    } else {
      current.add(type);
    }
    const next = DASHBOARD_WORLD_EVENT_TYPES.filter((entry) => current.has(entry));
    if (next.length === 0) return;
    updateConfig({ typeFilters: next });
  }

  return (
    <DashboardWidgetShell
      title={translateDashboardWidgetLabel('worldEvents', 'World Events')}
      icon={<Globe2 className="size-4 text-amber-400" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {customizeMode ? (
        <DashboardWidgetCustomizeFields
          category={
            <ul className="space-y-1.5">
              {DASHBOARD_WORLD_EVENT_TYPES.map((type) => (
                <li key={type}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-elevated">
                    <input
                      type="checkbox"
                      checked={settings.typeFilters.includes(type)}
                      onChange={() => toggleType(type)}
                      className="size-3.5 rounded border-border"
                    />
                    {t(worldEventTypeLabelKey(type))}
                  </label>
                </li>
              ))}
            </ul>
          }
          sort={
            <CustomizeOptionGroup>
              {DASHBOARD_WORLD_EVENT_SORT_OPTIONS.map((sortBy) => (
                <CustomizeOptionButton
                  key={sortBy}
                  selected={settings.sortBy === sortBy}
                  onClick={() => updateConfig({ sortBy: sortBy as DashboardWorldEventSortBy })}
                >
                  {t(worldEventSortLabelKey(sortBy as DashboardWorldEventSortBy))}
                </CustomizeOptionButton>
              ))}
            </CustomizeOptionGroup>
          }
          limit={
            <CustomizeOptionGroup>
              {DASHBOARD_WORLD_EVENT_LIMITS.map((limit) => (
                <CustomizeOptionButton
                  key={limit}
                  selected={settings.limit === limit}
                  onClick={() => updateConfig({ limit: limit as DashboardWorldEventLimit })}
                >
                  {limit}
                </CustomizeOptionButton>
              ))}
            </CustomizeOptionGroup>
          }
        />
      ) : items.length === 0 ? (
        <div className="space-y-3 text-sm text-muted">
          <p>{t('campaign.dashboard.worldEventsEmpty')}</p>
          <Link
            to={campaignChronologyPath(campaignHandle, 'feed')}
            className="font-medium text-primary hover:underline"
          >
            {t('campaign.dashboard.worldEventsOpenFeed')}
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-border/60 px-3 py-2"
            >
              <p className="text-xs text-muted">{item.timestamp}</p>
              <p className="mt-1 text-sm leading-snug text-foreground">
                <span className="mr-1" aria-hidden>
                  {WORLD_EVENT_TYPE_EMOJI[item.type as DashboardWorldEventType] ?? '·'}
                </span>
                {item.href ? (
                  <Link to={item.href} className="hover:text-primary hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  item.label
                )}
                <span className="text-muted"> ({item.typeLabel})</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </DashboardWidgetShell>
  );
}
