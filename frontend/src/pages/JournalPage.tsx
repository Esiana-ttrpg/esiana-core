import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, CalendarClock } from 'lucide-react';
import { useWiki } from '@/contexts/WikiContext';
import { CampaignCapabilities } from '@shared/campaignPolicy/capabilities';
import { JournalLibraryTab } from '@/components/journal/JournalLibraryTab';
import { JournalPlannerTab } from '@/components/journal/JournalPlannerTab';

type JournalTab = 'library' | 'planner';

/** Tablet-and-up gate for the Planner (matches the codebase's inline matchMedia convention). */
function useTabletUp(): boolean {
  const [tabletUp, setTabletUp] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 768px)').matches;
  });
  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const sync = () => setTabletUp(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  return tabletUp;
}

interface JournalPageProps {
  campaignHandle: string;
}

export function JournalPage({ campaignHandle }: JournalPageProps) {
  const { t } = useTranslation();
  const { can } = useWiki();
  const canPlan = can(CampaignCapabilities.JOURNAL_PLANNER_ACCESS);
  const tabletUp = useTabletUp();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedTab = searchParams.get('tab');
  const activeTab: JournalTab =
    requestedTab === 'planner' && canPlan ? 'planner' : 'library';

  const selectTab = (tab: JournalTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'library') next.delete('tab');
    else next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const tabs: { id: JournalTab; label: string; icon: typeof BookOpen }[] = [
    { id: 'library', label: t('journal.library.tab'), icon: BookOpen },
  ];
  if (canPlan) {
    tabs.push({ id: 'planner', label: t('journal.planner.tab'), icon: CalendarClock });
  }

  return (
    <div className="flex flex-col">
      <nav
        className="flex items-center gap-1 border-b border-border px-4 sm:px-6"
        aria-label={t('journal.library.title')}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={[
                'inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted hover:text-foreground',
              ].join(' ')}
            >
              <Icon className="size-4" aria-hidden />
              {tab.label}
              {tab.id === 'planner' && (
                <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                  {t('journal.planner.automationOptional')}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {activeTab === 'planner' && canPlan ? (
        tabletUp ? (
          <JournalPlannerTab campaignHandle={campaignHandle} />
        ) : (
          <div className="mx-auto max-w-md px-6 py-16 text-center text-sm text-muted">
            {t('journal.planner.restrictedViewport')}
          </div>
        )
      ) : (
        <JournalLibraryTab campaignHandle={campaignHandle} />
      )}
    </div>
  );
}

export default JournalPage;
