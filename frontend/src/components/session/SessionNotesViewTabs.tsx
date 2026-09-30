import {
  useCallback,
  useRef,
  type KeyboardEvent,
} from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export type SessionNotesViewId = 'notes' | 'attendance' | 'recaps';

export function parseSessionNotesView(
  raw: string | null,
): SessionNotesViewId {
  if (raw === 'attendance' || raw === 'recaps') return raw;
  return 'notes';
}

export function sessionNotesViewTabId(view: SessionNotesViewId): string {
  return `session-notes-tab-${view}`;
}

export function sessionNotesViewPanelId(view: SessionNotesViewId): string {
  return `session-notes-panel-${view}`;
}

function tabClass(isActive: boolean) {
  return `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-accent/15 text-accent'
      : 'text-muted hover:bg-elevated/60 hover:text-foreground'
  }`;
}

function searchForView(view: SessionNotesViewId): string {
  if (view === 'attendance') return 'view=attendance';
  if (view === 'recaps') return 'view=recaps';
  return '';
}

export function SessionNotesViewTabs() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeView = parseSessionNotesView(searchParams.get('view'));
  const tabRefs = useRef<Map<SessionNotesViewId, HTMLAnchorElement>>(new Map());

  const tabs: Array<{ id: SessionNotesViewId; label: string; search: string }> =
    [
      {
        id: 'notes',
        label: t('campaign.timeline.sessionNotesTabNotes'),
        search: searchForView('notes'),
      },
      {
        id: 'attendance',
        label: t('campaign.timeline.sessionNotesTabAttendance'),
        search: searchForView('attendance'),
      },
      {
        id: 'recaps',
        label: t('campaign.timeline.sessionNotesTabRecaps'),
        search: searchForView('recaps'),
      },
    ];

  const focusTab = useCallback((id: SessionNotesViewId) => {
    tabRefs.current.get(id)?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent, index: number) {
    if (tabs.length <= 1) return;

    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const next = tabs[nextIndex];
    if (!next) return;
    void navigate({ search: next.search });
    // Focus after navigation so the newly selected tab receives keyboard focus.
    requestAnimationFrame(() => focusTab(next.id));
  }

  return (
    <div
      className="flex flex-wrap gap-1"
      role="tablist"
      aria-label={t('campaign.timeline.sessionNotesPageTitle')}
    >
      {tabs.map((tab, index) => {
        const selected = activeView === tab.id;
        return (
          <NavLink
            key={tab.id}
            id={sessionNotesViewTabId(tab.id)}
            ref={(node) => {
              if (node) tabRefs.current.set(tab.id, node);
              else tabRefs.current.delete(tab.id);
            }}
            to={{ search: tab.search }}
            role="tab"
            aria-selected={selected}
            aria-controls={sessionNotesViewPanelId(tab.id)}
            tabIndex={selected ? 0 : -1}
            className={() => tabClass(selected)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            end
          >
            {tab.label}
          </NavLink>
        );
      })}
    </div>
  );
}
