import { BookOpen, Compass, ExternalLink, FileText, Globe, Link as LinkIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  DASHBOARD_QUICK_LINK_KEYS,
  DASHBOARD_QUICK_LINK_MAX,
  useResolvedDashboardQuickLinks,
  type DashboardQuickLinkKey,
} from '@/lib/dashboardQuickLinkCatalog';
import { normalizeDashboardQuickLinks, type DashboardExternalLinkIcon } from '@shared/dashboardQuickLinkCatalog';
import { QuickLinksEditor } from './QuickLinksEditor';
import { DashboardWidgetShell } from '../DashboardWidgetShell';
import { translateDashboardWidgetLabel } from '@/i18n/dashboardWidgetLabels';
import { quickLinkLabelKey } from '@/i18n/dashboardCustomizeLabels';

interface QuickUtilityNavProps {
  campaignHandle: string;
  isLookingForGroup?: boolean;
  customizeMode?: boolean;
  config?: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
  onHide?: () => void;
  canConfigure?: boolean;
}

export function QuickUtilityNav({
  campaignHandle,
  isLookingForGroup,
  customizeMode,
  config,
  onConfigChange,
  onHide,
  canConfigure = false,
}: QuickUtilityNavProps) {
  const { t } = useTranslation();
  const entries = normalizeDashboardQuickLinks(config?.links);
  const selectedKeys = entries.filter((entry): entry is DashboardQuickLinkKey => typeof entry === 'string');
  const editing = customizeMode && canConfigure;
  const links = useResolvedDashboardQuickLinks(campaignHandle, config, { isLookingForGroup });

  function toggleLink(key: DashboardQuickLinkKey) {
    if (!editing) return;
    if (!selectedKeys.includes(key) && entries.length >= DASHBOARD_QUICK_LINK_MAX) return;
    const next = selectedKeys.includes(key) ? entries.filter(entry => entry !== key) : [...entries, key];
    onConfigChange?.({ ...config, links: next });
  }

  return (
    <DashboardWidgetShell
      title={translateDashboardWidgetLabel('quickUtilityNav', 'Quick Links')}
      icon={<Compass className="size-4 text-primary" />}
      customizeMode={customizeMode}
      onHide={onHide}
    >
      {editing ? (
        <div className="space-y-3">
          <QuickLinksEditor entries={entries} internalLabel={key => t(quickLinkLabelKey(key))} onChange={next => onConfigChange?.({ ...config, links: next })} />
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
              const atCap = !checked && entries.length >= DASHBOARD_QUICK_LINK_MAX;
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
                    {t(quickLinkLabelKey(key))}
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
            links.map((link, index) => link.external ? (
              <a key={`${link.key}-${index}`} href={link.to} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-elevated hover:text-primary">
                {(() => { const icons = { link: LinkIcon, book: BookOpen, file: FileText, globe: Globe }; const Icon = icons[link.icon as DashboardExternalLinkIcon] ?? LinkIcon; return <Icon className="size-3.5 shrink-0 text-muted" aria-hidden />; })()}
                <span className="min-w-0 break-words">{link.label}</span>
                <ExternalLink className="size-3 shrink-0 text-muted" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              <Link
                key={`${link.key}-${index}`}
                to={link.to}
                className="rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-elevated hover:text-primary"
              >
                {link.internalKey ? t(quickLinkLabelKey(link.internalKey), { defaultValue: link.label }) : link.label}
              </Link>
            ))
          )}
        </nav>
      )}
    </DashboardWidgetShell>
  );
}
