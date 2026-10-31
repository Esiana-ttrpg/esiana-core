import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, LayoutDashboard, type LucideIcon } from 'lucide-react';
import { campaignDashboardPath, type CampaignSettingsTab } from '@/lib/campaignPaths';
import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';

export interface CampaignSettingsNavGroup {
  label: string;
  items: { id: CampaignSettingsTab; label: string; icon: LucideIcon }[];
}

interface Props {
  campaignHandle: string;
  campaignName: string;
  groups: CampaignSettingsNavGroup[];
  activeTab: CampaignSettingsTab;
  sectionHref: (tab: CampaignSettingsTab) => string;
  navigationLabel: string;
  settingsLabel: string;
}

export function CampaignSettingsNav({
  campaignHandle, campaignName, groups, activeTab, sectionHref, navigationLabel, settingsLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const activeLabel = groups.flatMap(group => group.items).find(item => item.id === activeTab)?.label;
  const linkClass = 'flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

  return (
    <aside className="min-w-0 border-b border-border bg-background md:sticky md:top-0 md:flex md:max-h-dvh md:w-56 md:shrink-0 md:flex-col md:self-start md:border-b-0 md:border-r">
      <div className="shrink-0 border-b border-border/80 p-3">
        <Link
          to={campaignDashboardPath(campaignHandle)}
          className={`${linkClass} border-transparent text-muted hover:border-accent/30 hover:bg-elevated/60 hover:text-accent`}
        >
          <LayoutDashboard aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />
          Dashboard
        </Link>
      </div>
      <p className={`shrink-0 break-words px-4 pb-2 pt-4 ${META_SECTION_LABEL_CLASS}`}>
        {campaignName} · {settingsLabel}
      </p>
      <button
        ref={toggleRef}
        type="button"
        aria-label={navigationLabel}
        aria-expanded={open}
        aria-controls="campaign-settings-navigation"
        onClick={() => setOpen(current => !current)}
        className={`${linkClass} m-3 w-[calc(100%-1.5rem)] justify-between border-border text-foreground md:hidden`}
      >
        {activeLabel}
        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <nav
        id="campaign-settings-navigation"
        aria-label={navigationLabel}
        className={`${open ? 'block' : 'hidden'} space-y-4 px-3 py-4 md:block md:min-h-0 md:overflow-y-auto md:overscroll-contain`}
      >
        {groups.filter(group => group.items.length > 0).map(group => (
          <div key={group.label}>
            <h2 className={`mb-2 px-3 ${META_SECTION_LABEL_CLASS}`}>{group.label}</h2>
            <ul className="space-y-1">
              {group.items.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <Link
                    to={sectionHref(id)}
                    aria-current={activeTab === id ? 'page' : undefined}
                    onClick={() => {
                      if (open) toggleRef.current?.focus();
                      setOpen(false);
                    }}
                    className={`${linkClass} ${activeTab === id
                      ? 'border-accent/50 bg-accent/10 text-accent'
                      : 'border-transparent text-muted hover:border-accent/30 hover:bg-elevated/60 hover:text-accent'}`}
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />
                    <span className="min-w-0 break-words">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
