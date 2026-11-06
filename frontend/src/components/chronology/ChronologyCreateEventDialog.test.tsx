import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter } from 'react-router-dom';
import type { FantasyCalendarApiRow } from '@/lib/timeTrackingApi';
import { ChronologyCreateEventDialog } from './ChronologyCreateEventDialog';

vi.mock('./ChronologyEventManagePanel', () => ({
  ChronologyEventForm: ({ calendarSelector, baseEvent }: { calendarSelector: React.ReactNode; baseEvent: { calendarId: string } }) =>
    <div>{calendarSelector}<output>{baseEvent.calendarId}</output></div>,
}));
vi.mock('@/lib/chronologyCalendar', () => ({ calendarRowToLike: () => ({}) }));
vi.mock('@/lib/chronologyDates', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/chronologyDates')>(), nowFromCalendarState: () => ({ year: 1, month: 0, day: 1 }),
}));

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

test('reconciles removed and newly available calendars and retains a valid selection', async () => {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  for (const [key, value] of Object.entries({ window, document: window.document, Node: window.Node,
    HTMLElement: window.HTMLElement, Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  for (const [method, value] of Object.entries({ showModal(this: HTMLElement) { this.setAttribute('open', ''); }, close(this: HTMLElement) { this.removeAttribute('open'); } })) {
    const previous = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, method);
    Object.defineProperty(window.HTMLElement.prototype, method, { configurable: true, writable: true, value });
    restore.push(() => previous ? Object.defineProperty(window.HTMLElement.prototype, method, previous) : Reflect.deleteProperty(window.HTMLElement.prototype, method));
  }
  Object.defineProperty(window, 'history', { configurable: true, value: { state: null, go: vi.fn() } });
  const container = window.document.getElementById('root')!;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(container);
  const calendar = (id: string, isMasterTime = false) => ({ id, name: id, isMasterTime, state: {} }) as FantasyCalendarApiRow;
  const a = calendar('a'); const b = calendar('b', true);
  const render = (calendars: FantasyCalendarApiRow[]) => root.render(<MemoryRouter><ChronologyCreateEventDialog
    campaignHandle="test" calendars={calendars} categories={[]} events={[]} initialDate={null} initialCalendarId="a"
    onClose={() => {}} onMutated={() => {}} /></MemoryRouter>);
  try {
    await act(async () => render([a, b]));
    expect(container.querySelector('output')?.textContent).toBe('a');
    await act(async () => render([b]));
    expect(container.querySelector('output')?.textContent).toBe('b');
    expect(container.querySelector('select')).toBeTruthy();
    await act(async () => render([a, b]));
    expect(container.querySelector('output')?.textContent).toBe('b');
    await act(async () => render([]));
    expect(window.document.querySelector('dialog')?.textContent).toContain('A calendar is required');
    await act(async () => render([a]));
    expect(container.querySelector('output')?.textContent).toBe('a');
    expect(window.document.querySelector('dialog')).toBeNull();
  } finally { await act(async () => root.unmount()); }
});
