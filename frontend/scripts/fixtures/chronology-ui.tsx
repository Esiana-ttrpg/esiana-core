// Isolated browser fixture: real chronology components and editor, mocked campaign API/context.

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { WidescreenCalendarView } from '../../src/components/chronology/WidescreenCalendarView';
import { ChronologyCreateEventDialog } from '../../src/components/chronology/ChronologyCreateEventDialog';
import { ChronologyEventSidebar } from '../../src/components/chronology/ChronologyEventSidebar';
import { calendarRowToLike } from '../../src/lib/chronologyCalendar';
import '../../src/index.css';
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
    generated: { truncated: query.has('truncated') },
    warnings: [],
  },
};
function App() {
  const [create, setCreate] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const loc = useLocation();
  const manage = !query.has('player');
  const mutated = async () => {
    await new Promise((r) => setTimeout(r, 100));
    setRefresh((n) => n + 1);
  };
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div>
        Path: {loc.pathname} <span id="refresh">Refresh {refresh}</span>{' '}
        {manage && <button onClick={() => setCreate(true)}>New event</button>}
      </div>
      <main style={{ minHeight: 0, flex: 1 }}>
        <WidescreenCalendarView
          campaignHandle="test"
          timeBundle={{ calendars: [calendar] }}
          chronologyBundle={bundle}
          baseEvents={[base]}
          categories={[category]}
          canManage={manage}
          onEventMutated={mutated}
        />
      </main>
      {create && (
        <ChronologyCreateEventDialog
          campaignHandle="test"
          calendars={[calendar]}
          categories={[category]}
          events={[base]}
          initialDate={{ year: 1, month: 1, day: 10 }}
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
