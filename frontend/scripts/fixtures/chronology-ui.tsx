// Isolated browser fixture: real chronology components and editor, mocked campaign API/context.

import { useCallback, useMemo, useState } from 'react';
import { ErasView } from '../../src/components/chronology/ErasView';
import { HistoricalTimeline } from '../../src/components/chronology/HistoricalTimeline';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation, useSearchParams } from 'react-router-dom';
import { WidescreenCalendarView } from '../../src/components/chronology/WidescreenCalendarView';
import { ChronologyCreateEventDialog } from '../../src/components/chronology/ChronologyCreateEventDialog';
import { ChronologyEventSidebar } from '../../src/components/chronology/ChronologyEventSidebar';
import { calendarRowToLike } from '../../src/lib/chronologyCalendar';
import '../../src/index.css';
import { initI18n } from '../../src/i18n/initI18n';
initI18n();
const query = new URLSearchParams(location.search);
const calendar = {
  id: 'clock',
  name: 'World',
  isMasterTime: true,
  epochOffset: '123',
  weekdays: Array.from({ length: query.has('custom') ? 5 : 7 }, (_, i) => ({
    name: 'Day ' + (i + 1),
    length: 1,
  })),
  months: [
    { name: 'Before', length: 30 },
    {
      name: 'Returning',
      length: 30,
      ...(query.has('climate') ? { climateAspect: 'PLUVIAL' } : {}),
    },
    { name: 'After', length: 30 },
  ],
  seasons: [{ name: 'Rain season', startMonthIndex: 1, startDay: 15 }],
  moons: [
    { name: 'Aster', cycleDays: 8 },
    { name: 'Iris', cycleDays: 16 },
  ],
  leapDays: [],
  state: {
    year: 1,
    monthIndex: 1,
    monthName: 'Returning',
    day: 10,
    activeMoonPhases: [],
    seasonName: 'Rain season',
  },
};
const calendars = query.has('twoClocks') ? [calendar, {
  ...calendar, id: 'other', name: 'Other', isMasterTime: false, epochOffset: query.has('unaligned') ? 'unsupported' : '5000',
  months: [{ name: 'Long rain', length: 51 }],
  state: { ...calendar.state, year: 1, monthIndex: 0, monthName: 'Long rain', day: 36 },
}] : [calendar];
const base = {
  id: 'journey',
  calendarId: 'clock',
  categoryId: 'cat',
  prerequisiteId: null,
  visibility: 'PARTY',
  importance: 'MAJOR',
  title: 'The long journey',
  description: '**Remember** the crossing.',
  duration: 40,
  isRepeating: true,
  repeatInterval: 2,
  repeatUnit: 'YEARS',
  limitRepetitions: 3,
  conditions: {
    type: 'CRITERIA',
    parameter: 'DAY',
    comparison: 'EQUALS',
    value: '25',
  },
  moonOverrides: [{ moonId: 'Aster', mode: 'OFFSET', offset: 2 }],
  isRecurring: false,
  targetYear: 1,
  targetMonth: 0,
  targetDay: 25,
  targetEpochMinute: '34683',
  recurrenceRule: null,
  createdAt: '',
  updatedAt: 'original',
  tags: [],
};
const occurrences = Array.from({ length: 30 }, (_, i) => ({
  ...base,
  baseEventId: base.id,
  occurrenceId: 'occ_' + i,
  occurrenceIndex: 0,
  start: { year: 1, month: 1, day: i + 1, epochMinute: null },
  end: { year: 1, month: 2, day: 4, epochMinute: null },
  dayOffset: i + 6,
  isContinuation: true,
  isStart: false,
  sourceType: 'REPEATING',
}));
for (let i = 0; i < 4; i++)
  occurrences.push({
    ...occurrences[9],
    baseEventId: 'extra' + i,
    occurrenceId: 'extra' + i,
    title: 'Milestone ' + i,
    duration: 1,
    dayOffset: 0,
    importance: i === 0 ? 'NOTICE' : 'MINOR',
  });
const category = {
  id: 'cat',
  campaignId: 'test',
  name: 'World history',
  color: null,
};
const bundle = {
  calendars: [calendar],
  categories: [category],
  baseEvents: [base],
  occurrences,
  events: occurrences,
  expansionMetadata: {
    generated: { truncated: query.has('truncated'), truncatedBaseEventIds: query.has('truncated') ? ['journey'] : [] },
    warnings: [],
  },
};
const timelineRows = query.has('dense') ? Array.from({ length: 45 }, (_, index) => ({
  ...occurrences[9], baseEventId: 'dense-' + index, occurrenceId: 'dense-' + index,
  title: 'Discovery ' + String(index).padStart(2, '0'), occurrenceIndex: index,
  start: { year: 1, month: 1, day: 10, epochMinute: null },
  end: { year: 1, month: 1, day: 10, epochMinute: null },
  dayOffset: 0, duration: 1, importance: index < 3 ? 'MAJOR' : 'MINOR',
})) : occurrences;
if (query.has('twoClocks')) timelineRows.push({ ...occurrences[9], calendarId: 'other', baseEventId: 'other-event',
  occurrenceId: 'other-event', title: 'Neri discovers the archive', dayOffset: 0, duration: 8,
  start: { year: 1, month: 0, day: 30, epochMinute: '0' }, end: { year: 1, month: 0, day: 37, epochMinute: '0' } });
const timelineBundle = {
  ...bundle, calendars, occurrences: timelineRows,
  baseEvents: [base, ...timelineRows.filter(row => row.baseEventId !== base.id).map(row => ({ ...base, id: row.baseEventId, calendarId: row.calendarId, title: row.title, duration: row.duration }))],
  eras: [{ id: 'era', calendarId: 'clock', name: 'World history', calendarName: 'World',
    isMasterTime: true, sortOrder: 0, isCurrent: true, status: 'PRESENT', visibility: 'PARTY',
    startDate: { year: 1, month: 0, day: 15 }, endDate: null, overview: 'The crossing',
    overviewPageId: 'era-page', canManage: !query.has('player') }, ...(query.has('eras') ? [{ id: 'earlier-era', calendarId: 'clock', name: 'Early discoveries', calendarName: 'World', isMasterTime: true, sortOrder: 1, isCurrent: false, status: 'PAST', visibility: 'PARTY', startDate: { year: 1, month: 0, day: 1 }, endDate: { year: 1, month: 0, day: 10 }, overview: '**Mira** mapped the coast.', overviewPageId: 'early-page', canManage: !query.has('player') }] : []), ...(query.has('twoClocks') ? [{
      id: 'other-era', calendarId: 'other', name: 'Age of discovery', calendarName: 'Other', isMasterTime: false,
      sortOrder: 0, isCurrent: true, status: 'PRESENT', visibility: 'PARTY', startDate: { year: 1, month: 0, day: 20 },
      endDate: { year: 1, month: 0, day: 40 }, overview: '', overviewPageId: 'other-era-page', canManage: !query.has('player'),
    }] : [])],
};
function App() {
  const [params, setParams] = useSearchParams();
  const session = useMemo(() => ({}), []);
  const [navigationRequest, setNavigationRequest] = useState();
  const [eraRows, setEraRows] = useState(timelineBundle.eras);
  const activeBundle = { ...timelineBundle, eras: eraRows };
  const eraMutation = async () => {
    if (window.__savedEra) setEraRows(rows => [...rows.filter(row => row.id !== window.__savedEra.id), window.__savedEra]);
    if (window.__deletedEra) setEraRows(rows => rows.filter(row => row.id !== window.__deletedEra));
    setRefresh(n => n + 1);
  };
  const openTimeline = (calendarId, eraId, compare) => {
    setNavigationRequest(previous => ({ id: (previous?.id ?? 0) + 1, calendarId, eraId, compare }));
    const next = new URLSearchParams(params); next.set('view', 'timeline'); next.set('track', calendarId); next.set('era', eraId); setParams(next);
  };
  const [create, setCreate] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const loc = useLocation();
  const [anchor, setAnchor] = useState({ year: 1, month: 1, day: 10 });
  const browse = useCallback(date => setAnchor(date), []);
  const manage = !query.has('player');
  const mutated = async () => {
    await new Promise((r) => setTimeout(r, 100));
    setRefresh((n) => n + 1);
  };
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div>
        Path: {loc.pathname}
        {query.has('eras') && <><button onClick={() => { const next = new URLSearchParams(params); next.set('view', 'eras'); setParams(next); }}>Eras tab</button>
          <button onClick={() => { const next = new URLSearchParams(params); next.set('view', 'timeline'); setParams(next); }}>Timeline tab</button></>} <span id="refresh">Refresh {refresh}</span>{' '}
        {manage && <button onClick={() => setCreate(true)}>New event</button>}
      </div>
      <main style={{ minHeight: 0, flex: 1 }}>
        {query.has('eras') && params.get('view') !== 'timeline' ? <ErasView campaignHandle="test" bundle={activeBundle}
          timeBundle={{ calendars }} canManage={manage} onErasChanged={eraMutation} onEventMutated={mutated} onEventDeleted={() => {}} onRevealEvent={async () => {}}
          onTimeline={openTimeline} /> : query.has('timeline') || query.has('eras') ? <HistoricalTimeline campaignHandle="test" bundle={activeBundle} session={session} navigationRequest={navigationRequest}
          timeBundle={{ calendars: [...calendars, { ...calendar, id: 'unauthorized', name: 'Unauthorized clock' }], currentEpochMinute: '56283' }} canManage={manage} onBrowseAnchorChange={browse}
          onMutated={mutated} onDeleted={() => {}} onRevealEvent={async () => {}} /> : <WidescreenCalendarView
          campaignHandle="test"
          timeBundle={{ calendars: [calendar] }}
          chronologyBundle={bundle}
          baseEvents={[base]}
          categories={[category]}
          canManage={manage}
          onEventMutated={mutated}
        />}
      </main>
      {create && (
        <ChronologyCreateEventDialog
          campaignHandle="test"
          calendars={[calendar]}
          categories={[category]}
          events={[base]}
          initialDate={anchor}
          onClose={() => setCreate(false)}
          onMutated={mutated}
        />
      )}
      {query.has('sidebar') && (
        <div style={{ height: 300 }}>
          <ChronologyEventSidebar
            campaignHandle="test"
            baseEvent={base}
            calendarLike={calendarRowToLike(calendar)}
            canManage={manage}
            categories={[category]}
            editableEvents={[base]}
            open
            onClose={() => {}}
            onMutated={mutated}
          />
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
