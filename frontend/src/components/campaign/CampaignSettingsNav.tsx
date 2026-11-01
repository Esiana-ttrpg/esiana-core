import { Link } from 'react-router-dom';
import { ArrowLeft, X, type LucideIcon } from 'lucide-react';
import { SidebarCollapseToggle } from '@/components/layout/SidebarCollapseToggle';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { CampaignSettingsTab } from '@/lib/campaignPaths';
import {
  META_SECTION_LABEL_CLASS,
  SIDEBAR_NAV_ITEM_CLASS,
  SIDEBAR_NAV_PRIMARY_CLASS,
  campaignSidebarShellClass,
} from '@/lib/surfaceLayout';

export interface CampaignSettingsNavGroup {
  label: string;
  items: { id: CampaignSettingsTab; label: string; icon: LucideIcon }[];
}

interface CampaignSettingsNavProps {
  groups: CampaignSettingsNavGroup[];
  activeTab: CampaignSettingsTab;
  sectionHref: (tab: CampaignSettingsTab) => string;
  navigationLabel: string;
  backHref: string;
  backLabel: string;
  onNavigate?: () => void;
  onClose?: () => void;
  collapsed?: boolean;
  loading?: boolean;
  className?: string;
}

function settingsNavItemClass(collapsed: boolean, active = false): string {
  return [
    SIDEBAR_NAV_ITEM_CLASS,
    collapsed
      ? 'sidebar-nav-item--collapsed flex min-h-11 items-center justify-center rounded-md p-2'
      : 'flex min-h-11 items-center gap-2 rounded-md px-2 py-2 text-sm',
    active ? 'sidebar-nav-item--active' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function CampaignSettingsNav({
  groups,
  activeTab,
  sectionHref,
  navigationLabel,
  backHref,
  backLabel,
  onNavigate,
  onClose,
  collapsed = false,
  loading = false,
  className = '',
}: CampaignSettingsNavProps) {
  const visibleGroups = groups.filter((group) => group.items.length > 0);
  const navPad = `${collapsed ? 'px-0.5' : 'px-1'} ${!onClose ? 'lg:pr-3.5' : ''}`;

  return (
    <aside className={campaignSidebarShellClass(collapsed, className)}>
      {onClose ? (
        <div className="flex justify-end px-2 pt-2 lg:hidden">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-canvas/30 hover:text-foreground"
            aria-label="Close campaign menu"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      <div className={`shrink-0 pt-2 ${navPad}`}>
        <Link
          to={backHref}
          onClick={onNavigate}
          title={collapsed ? backLabel : undefined}
          aria-label={backLabel}
          className={settingsNavItemClass(collapsed)}
        >
          <ArrowLeft aria-hidden="true" className="size-3.5 shrink-0 opacity-80" strokeWidth={1.5} />
          {collapsed ? null : <span className="min-w-0 truncate">{backLabel}</span>}
        </Link>
      </div>

      <nav
        id="campaign-settings-navigation"
        aria-label={navigationLabel}
        className={`flex-1 overflow-y-auto py-2 ${navPad}`}
      >
        {loading ? (
          <div className="py-8">
            <LoadingSpinner label="Loading navigation…" />
          </div>
        ) : (
          <div className={SIDEBAR_NAV_PRIMARY_CLASS}>
            {visibleGroups.map((group) => (
              <div key={group.label}>
                {collapsed ? null : (
                  <div className="mt-4 px-3 first:mt-2">
                    <p className={META_SECTION_LABEL_CLASS}>{group.label}</p>
                  </div>
                )}
                {group.items.map(({ id, label, icon: Icon }) => {
                  const active = activeTab === id;
                  return (
                    <Link
                      key={id}
                      to={sectionHref(id)}
                      onClick={onNavigate}
                      title={collapsed ? label : undefined}
                      aria-label={collapsed ? label : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={settingsNavItemClass(collapsed, active)}
                    >
                      <Icon aria-hidden="true" className="size-3.5 shrink-0 opacity-80" strokeWidth={1.5} />
                      {collapsed ? null : <span className="min-w-0 truncate">{label}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </nav>

      {!onClose ? <SidebarCollapseToggle /> : null}
    </aside>
  );
}
