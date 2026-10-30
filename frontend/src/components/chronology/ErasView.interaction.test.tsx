import { afterEach, expect, test, vi } from 'vitest';
import { act, type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { parseHTML } from 'linkedom';
import { ErasView } from './ErasView';
import type { ChronologyEra } from '@shared/chronologyEras';

vi.mock('@/contexts/WikiContext', () => ({ useWiki: () => ({ can: () => true, flatPages: [] }) }));
vi.mock('./ChronologyEventSidebar', () => ({ ChronologyEventSidebar: () => null }));
vi.mock('@/components/wiki/WikiTipTapEditor', () => ({ WikiTipTapEditor: () => null }));
vi.mock('./comparisonText', () => ({
  useComparisonText: () => () => '',
  comparisonDateLabel: (_axis: unknown, minute: bigint) => `Day ${minute / 1440n + 1n}`,
}));

const date = (day: number) => ({ year: 1, month: 0, day });
const era = (id: string, sortOrder: number): ChronologyEra => ({
  id, name: id, sortOrder, calendarId: 'world', calendarName: 'World', isMasterTime: true,
  isCurrent: id === 'Present', startDate: null, endDate: null, status: 'PRESENT',
  visibility: 'PARTY', overviewPageId: `overview-${id}`, overview: '', canManage: true,
});
const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); vi.restoreAllMocks(); });

async function mount(manage = true, count = 6) {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement,
    Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  const onTimeline = vi.fn();
  const props = {
    campaignHandle: 'archive', canManage: manage, onTimeline,
    onErasChanged: vi.fn(), onEventMutated: vi.fn(), onEventDeleted: vi.fn(), onRevealEvent: vi.fn(),
    timeBundle: { currentEpochMinute: '0', calendars: [{ id: 'world', name: 'World', isMasterTime: true,
      epochOffset: '0', months: [{ name: 'Rain', length: 30, type: 'standard' }], weekdays: [], seasons: [], moons: [], leapDays: [],
      state: { year: 1, monthIndex: 0, day: 7, hour: 0, minute: 0 } }] },
    bundle: {
      calendars: [{ id: 'world', name: 'World', isMasterTime: true }], categories: [],
      eras: [era('Future', 2), era('Past', 0), { ...era('Present', 1), canManage: manage }],
      baseEvents: [{ id: 'journey', calendarId: 'world' }],
      occurrences: Array.from({ length: count }, (_, i) => ({ occurrenceId: `occ-${i}`, baseEventId: 'journey', occurrenceIndex: i,
        calendarId: 'world', title: `Discovery ${i + 1}`, importance: 'MAJOR', start: date(i + 1), end: date(i + 1),
        duration: 1, dayOffset: 0, isStart: true, isContinuation: false })),
      expansionMetadata: { generated: { truncated: false } },
    },
  } as unknown as ComponentProps<typeof ErasView>;
  const container = window.document.getElementById('root')!;
  const root = createRoot(container);
  await act(async () => root.render(<MemoryRouter initialEntries={['/?view=eras&focus=eras']}><ErasView {...props} /></MemoryRouter>));
  const click = async (element: Element | null | undefined) => {
    expect(element).toBeTruthy();
    await act(async () => { element!.dispatchEvent(new window.Event('click', { bubbles: true })); });
  };
  const button = (label: string) => [...container.querySelectorAll('button')].find(row => row.textContent === label);
  return { container, onTimeline, click, button, unmount: async () => { await act(async () => root.unmount()); } };
}

test('era browsing navigates in configured order while dates and events link to Timeline', async () => {
  const ui = await mount();
  try {
    expect(ui.container.querySelector('h2')?.textContent).toBe('Present');
    expect(ui.container.textContent).toContain('Current era');
    expect(ui.container.textContent).toContain('Contains campaign today');
    expect(ui.container.textContent).toContain('Dates not set');
    expect(ui.container.textContent).not.toMatch(/unspecified|Display position|coverage|loaded|Manage era/);
    expect(ui.container.querySelector('header')?.textContent).toContain('Edit era');
    expect(ui.button('Add overview')).toBeTruthy();
    expect(ui.container.querySelectorAll('li')).toHaveLength(5);
    expect(ui.container.querySelector('li')?.textContent).toContain('Discovery 1');
    expect(ui.container.querySelector('li')?.textContent).toContain('Day 1');
    await ui.click(ui.button('Show all events'));
    expect(ui.onTimeline).toHaveBeenLastCalledWith('world', 'Present');
    await ui.click(ui.container.querySelector('[aria-label="Open Present on Timeline"]'));
    expect(ui.onTimeline).toHaveBeenLastCalledWith('world', 'Present');
    const nav = ui.container.querySelector('nav')!;
    expect(nav.querySelector('[aria-current]')?.textContent).toContain('Present');
    await ui.click(nav.querySelector('button'));
    expect(ui.container.querySelector('h2')?.textContent).toBe('Past');
    expect(ui.container.querySelector('nav')?.textContent).toContain('No previous era');
    expect(ui.onTimeline).toHaveBeenCalledTimes(2);
    const selector = ui.container.querySelectorAll('select')[1]!;
    const future = [...selector.querySelectorAll('option')].find(row => row.value === 'Future')!;
    await act(async () => {
      for (const option of selector.querySelectorAll('option')) option.selected = option === future;
      selector.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(ui.container.querySelector('h2')?.textContent).toBe('Future');
    expect(ui.container.querySelector('nav')?.textContent).toContain('No next era');
    const major = ui.container.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    // Linkedom does not perform the browser's default checkbox toggle on click.
    major.checked = false;
    await ui.click(major);
    expect(ui.container.textContent).toContain('No matching events in this era.');
    expect(ui.button('Show all events')).toBeUndefined();
  } finally { await ui.unmount(); }
});

test('readers get browsing and empty states without management or unnecessary event actions', async () => {
  const ui = await mount(false, 0);
  try {
    expect(ui.container.textContent).toContain('No overview yet.');
    expect(ui.container.textContent).toContain('No matching events in this era.');
    for (const label of ['Create era', 'Edit era', 'Add overview', 'Show all events']) expect(ui.button(label)).toBeUndefined();
    expect(ui.container.querySelector('details')).toBeNull();
  } finally { await ui.unmount(); }
});
