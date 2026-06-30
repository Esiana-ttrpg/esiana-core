import {
  BookOpen,
  FileText,
  Map,
  MapPin,
  Package,
  PawPrint,
  ScrollText,
  Swords,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  DASHBOARD_RECENT_ENTITY_CATEGORIES,
  DASHBOARD_RECENT_ENTITY_LIMITS,
  DASHBOARD_RECENT_ENTITY_SORT_OPTIONS,
  normalizeRecentEntitiesConfig,
  type DashboardRecentEntityCategory,
  type DashboardRecentEntityLimit,
  type DashboardRecentEntitySortBy,
} from '@shared/dashboardRecentEntitiesCatalog';
import type { RecentEntitiesFeedResult } from '@/lib/dashboardWidgetFeeds';
import { translateDashboardWidgetLabel } from '@/i18n/dashboardWidgetLabels';
import {
  recentEntityCategoryLabelKey,
  recentEntitySortLabelKey,
} from '@/i18n/dashboardCustomizeLabels';
import { DashboardWidgetShell } from '../DashboardWidgetShell';
import {
  CustomizeOptionButton,
  CustomizeOptionGroup,
  DashboardWidgetCustomizeFields,
} from '../DashboardWidgetCustomizeFields';

interface RecentEntitiesWidgetProps {
  feed?: RecentEntitiesFeedResult | null;
  customizeMode?: boolean;
  config?: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
  onHide?: () => void;
}

function iconForCategory(categoryKey: string | null, templateType: string) {
  const key = categoryKey ?? templateType.toUpperCase();
  switch (key) {
    case 'characters':
    case 'CHARACTER':
      return Users;
    case 'organizations':
    case 'ORGANIZATION':
      return Swords;
    case 'locations':
    case 'LOCATION':
      return MapPin;
    case 'events':
      return ScrollText;
    case 'objects':
    case 'OBJECT':
      return Package;
    case 'bestiary':
    case 'BESTIARY':
      return PawPrint;
    case 'maps':
      return Map;
    default:
      return FileText;
  }
}

export function RecentEntitiesWidget({
  feed,
  customizeMode,
  config,
  onConfigChange,
  onHide,
}: RecentEntitiesWidgetProps) {
  const { t } = useTranslation();
  const settings = normalizeRecentEntitiesConfig(config);
  const items = feed?.items ?? [];

  function updateConfig(patch: Partial<typeof settings>) {
    onConfigChange?.({ ...config, ...settings, ...patch });
  }

  return (
    <DashboardWidgetShell
      title={translateDashboardWidgetLabel('recentEntities', 'Recent Entities')}
      icon={<BookOpen className="size-4 text-violet-400" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {customizeMode ? (
        <DashboardWidgetCustomizeFields
          category={
            <CustomizeOptionGroup>
              {DASHBOARD_RECENT_ENTITY_CATEGORIES.map((category) => (
                <CustomizeOptionButton
                  key={category}
                  selected={settings.category === category}
                  onClick={() => updateConfig({ category })}
                >
                  {t(recentEntityCategoryLabelKey(category))}
                </CustomizeOptionButton>
              ))}
            </CustomizeOptionGroup>
          }
          sort={
            <CustomizeOptionGroup>
              {DASHBOARD_RECENT_ENTITY_SORT_OPTIONS.map((sortBy) => (
                <CustomizeOptionButton
                  key={sortBy}
                  selected={settings.sortBy === sortBy}
                  onClick={() => updateConfig({ sortBy: sortBy as DashboardRecentEntitySortBy })}
                >
                  {t(recentEntitySortLabelKey(sortBy as DashboardRecentEntitySortBy))}
                </CustomizeOptionButton>
              ))}
            </CustomizeOptionGroup>
          }
          limit={
            <CustomizeOptionGroup>
              {DASHBOARD_RECENT_ENTITY_LIMITS.map((limit) => (
                <CustomizeOptionButton
                  key={limit}
                  selected={settings.limit === limit}
                  onClick={() => updateConfig({ limit: limit as DashboardRecentEntityLimit })}
                >
                  {limit}
                </CustomizeOptionButton>
              ))}
            </CustomizeOptionGroup>
          }
        />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">{t('campaign.dashboard.recentEntitiesEmpty')}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = iconForCategory(item.categoryKey, item.templateType);
            return (
              <li key={item.id}>
                <Link
                  to={item.href}
                  className="flex items-start gap-3 rounded-lg border border-border bg-background/50 px-3 py-2 text-sm transition-colors hover:border-primary/40"
                >
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary/70" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{item.title}</span>
                    {item.subtitle ? (
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {item.subtitle}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted">
                    {new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(
                      new Date(item.timestamp),
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardWidgetShell>
  );
}
