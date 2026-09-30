import { NavLink, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export type SessionNotesViewId = 'notes' | 'attendance' | 'recaps';

export function parseSessionNotesView(
  raw: string | null,
): SessionNotesViewId {
  if (raw === 'attendance' || raw === 'recaps') return raw;
  return 'notes';
}

function tabClass(isActive: boolean) {
  return `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-accent/15 text-accent'
      : 'text-muted hover:bg-elevated/60 hover:text-foreground'
  }`;
}

export function SessionNotesViewTabs() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const activeView = parseSessionNotesView(searchParams.get('view'));

  const tabs: Array<{ id: SessionNotesViewId; label: string; search: string }> =
    [
      {
        id: 'notes',
        label: t('campaign.timeline.sessionNotesTabNotes'),
        search: '',
      },
      {
        id: 'attendance',
        label: t('campaign.timeline.sessionNotesTabAttendance'),
        search: 'view=attendance',
      },
      {
        id: 'recaps',
        label: t('campaign.timeline.sessionNotesTabRecaps'),
        search: 'view=recaps',
      },
    ];

  return (
    <div
      className="flex flex-wrap gap-1"
      role="tablist"
      aria-label={t('campaign.timeline.sessionNotesPageTitle')}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.id}
          to={{ search: tab.search }}
          role="tab"
          aria-selected={activeView === tab.id}
          className={() => tabClass(activeView === tab.id)}
          end
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}
