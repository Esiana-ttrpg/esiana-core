import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter } from 'react-router-dom';
import { SessionScheduleCard } from './SessionScheduleCard';
import type { DashboardSessionSummary } from '@/lib/dashboardSummary';

const mocks = vi.hoisted(() => ({ schedule: vi.fn() }));
vi.mock('@/lib/campaignSchedule', () => ({ fetchCampaignSchedule: mocks.schedule }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/components/session/ScheduleSessionModal', () => ({ ScheduleSessionModal: () => null }));
vi.mock('@/components/session/SkipSessionModal', () => ({ SkipSessionModal: () => null }));
const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

async function mount(session: DashboardSessionSummary) {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(window.document.getElementById('root')!);
  await act(async () => root.render(<MemoryRouter><SessionScheduleCard campaignHandle="review" canManageCampaign
    schedule={{ day: null, time: null, frequency: null }} nextSession={session} /></MemoryRouter>));
  return { container: window.document.getElementById('root')!, unmount: () => act(async () => root.unmount()) };
}
const next = { timelinePointId: 'session-4', title: 'Across the Glasswater', sequenceOrder: 4,
  plannedStartAt: '2030-01-03T19:00:00Z', timezone: 'UTC', venueLabel: 'Juniper’s home' };

test('an authoritative empty schedule does not resurrect a skipped or cancelled placeholder from stale bundle data', async () => {
  mocks.schedule.mockResolvedValue({ upcoming: null, schedule: { autoScheduleUpcomingSession: true, isOneShot: false } });
  const ui = await mount(next);
  try {
    expect(ui.container.querySelector('[data-session-state]')?.getAttribute('data-session-state')).toBe('empty');
    expect(ui.container.textContent).not.toContain('Across the Glasswater');
    expect(ui.container.textContent).toContain('Schedule next session');
  } finally { await ui.unmount(); }
});

test('schedule refresh retains recorded venue details when the cadence endpoint omits them', async () => {
  mocks.schedule.mockResolvedValue({ upcoming: { timelinePointId: next.timelinePointId, sessionTitle: next.title, sequenceOrder: 4,
    status: 'PUBLISHED', plannedStartAt: next.plannedStartAt, timezone: 'UTC' }, schedule: {} });
  const ui = await mount(next);
  try { expect(ui.container.textContent).toContain('Juniper'); }
  finally { await ui.unmount(); }
});

test('an ongoing session cannot display edit controls for a different future session', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-31T20:00:00Z'));
  mocks.schedule.mockResolvedValue({ upcoming: { timelinePointId: next.timelinePointId, sessionTitle: next.title, sequenceOrder: 4,
    status: 'PUBLISHED', plannedStartAt: next.plannedStartAt }, schedule: {} });
  const ui = await mount({ ...next, timelinePointId: 'session-3', title: 'The missing atlas', sequenceOrder: 3,
    plannedStartAt: '2026-10-31T19:00:00Z', plannedEndAt: '2026-10-31T22:00:00Z' });
  try {
    expect(ui.container.textContent).toContain('In progress');
    expect(ui.container.textContent).toContain('The missing atlas');
    expect(ui.container.textContent).not.toContain('Edit schedule');
    expect(ui.container.textContent).not.toContain('Skip session');
  } finally { await ui.unmount(); }
});
