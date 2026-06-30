import { Compass } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  DASHBOARD_QUICK_LINK_KEYS,
  DASHBOARD_QUICK_LINK_MAX,
  normalizeDashboardQuickLinkKeys,
  useResolvedDashboardQuickLinks,
  type DashboardQuickLinkKey,
} from '@/lib/dashboardQuickLinkCatalog';
import { DashboardWidgetShell } from '../DashboardWidgetShell';
import { translateDashboardWidgetLabel } from '@/i18n/dashboardWidgetLabels';

interface QuickUtilityNavProps {
  campaignHandle: string;
  isLookingForGroup?: boolean;
  customizeMode?: boolean;
  config?: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
  onHide?: () => void;
}

export function QuickUtilityNav({
  campaignHandle,
  isLookingForGroup,
  customizeMode,
  config,
  onConfigChange,
  onHide,
}: QuickUtilityNavProps) {
  const { t } = useTranslation();
  const selectedKeys = normalizeDashboardQuickLinkKeys(config?.links);
  const links = useResolvedDashboardQuickLinks(campaignHandle, config, { isLookingForGroup });

  function toggleLink(key: DashboardQuickLinkKey) {
    const current = new Set(selectedKeys);
    if (current.has(key)) {
      current.delete(key);
    } else if (current.size < DASHBOARD_QUICK_LINK_MAX) {
      current.add(key);
    } else {
      return;
    }
    const next = DASHBOARD_QUICK_LINK_KEYS.filter((entry) => current.has(entry));
    onConfigChange?.({ ...config, links: next });
  }

  return (
    <DashboardWidgetShell
      title={translateDashboardWidgetLabel('quickUtilityNav', 'Quick Links')}
      icon={<Compass className="size-4 text-cyan-400" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {customizeMode ? (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            {t('campaign.dashboard.quickLinksCustomizeHint', {
              max: DASHBOARD_QUICK_LINK_MAX,
            })}
          </p>
          <ul className="space-y-1.5">
            {DASHBOARD_QUICK_LINK_KEYS.filter(
              (key) => key !== 'recruitment' || isLookingForGroup,
            ).map((key) => {
              const checked = selectedKeys.includes(key);
              const atCap = !checked && selectedKeys.length >= DASHBOARD_QUICK_LINK_MAX;
              return (
                <li key={key}>
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                      atCap ? 'cursor-not-allowed opacity-50' : 'hover:bg-elevated'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={atCap}
                      onChange={() => toggleLink(key)}
                      className="size-3.5 rounded border-border"
                    />
                    {t(`campaign.dashboard.quickLink.${key}`)}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <nav className="flex flex-col gap-1">
          {links.length === 0 ? (
            <p className="text-sm text-muted">{t('campaign.dashboard.quickLinksEmpty')}</p>
          ) : (
            links.map((link) => (
              <Link
                key={link.key}
                to={link.to}
                className="rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-elevated hover:text-primary"
              >
                {t(`campaign.dashboard.quickLink.${link.key}`, { defaultValue: link.label })}
              </Link>
            ))
          )}
        </nav>
      )}
    </DashboardWidgetShell>
  );
}
