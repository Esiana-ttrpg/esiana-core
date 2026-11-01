import { afterEach, expect, test, vi } from 'vitest';
import { act, type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { parseHTML } from 'linkedom';
import { ErasView } from './ErasView';
import type { ChronologyEra } from '@shared/chronologyEras';

const mocks = vi.hoisted(() => ({ api: vi.fn(), editor: vi.fn((_props: { content: string; onChange: (value: string) => void }) => null) }));
vi.mock('@/lib/api', () => ({ apiFetch: mocks.api }));
vi.mock('@/contexts/WikiContext', () => ({ useWiki: () => ({ can: () => true, flatPages: [] }) }));
vi.mock('./ChronologyEventSidebar', () => ({ ChronologyEventSidebar: () => null }));
vi.mock('@/components/wiki/WikiTipTapEditor', () => ({ WikiTipTapEditor: mocks.editor }));
vi.mock('./comparisonText', () => ({
  useComparisonText: () => () => '',
  comparisonDateLabel: (_axis: unknown, minute: bigint) => `Day ${minute / 1440n + 1n}`,
}));

const date = (day: number) => ({ year: 1, month: 0, day });
const era = (id: string, sortOrder: number): ChronologyEra => ({
  id, name: id, sortOrder, calendarId: 'world', calendarName: 'World', isMasterTime: true,
  isCurrent: id === 'Present', startDate: null, endDate: null, status: 'PRESENT',
  visibility: 'PARTY', description: null, overviewPageId: `overview-${id}`, overview: '', canManage: true,
});
const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

function Location() { return <output data-route>{useLocation().pathname}</output>; }

async function mount(manage = true, count = 6, truncated = false, overview = '') {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement,
    Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  for (const [method, value] of Object.entries({ showModal(this: HTMLElement) { this.setAttribute('open', ''); }, close(this: HTMLElement) { this.removeAttribute('open'); } })) {
    const prototype = window.HTMLElement.prototype;
    const previous = Object.getOwnPropertyDescriptor(prototype, method);
    Object.defineProperty(prototype, method, { configurable: true, value });
    restore.push(() => { if (previous) Object.defineProperty(prototype, method, previous); else Reflect.deleteProperty(prototype, method); });
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
      eras: [era('Future', 2), era('Past', 0), { ...era('Present', 1), canManage: manage, overview }],
      baseEvents: [{ id: 'journey', calendarId: 'world' }],
      occurrences: Array.from({ length: count }, (_, i) => ({ occurrenceId: `occ-${i}`, baseEventId: 'journey', occurrenceIndex: i,
        calendarId: 'world', title: `Discovery ${i + 1}`, importance: 'MAJOR', start: date(i + 1), end: date(i + 1),
        duration: 1, dayOffset: 0, isStart: true, isContinuation: false })),
      expansionMetadata: { generated: { truncated }, warnings: [] },
    },
  } as unknown as ComponentProps<typeof ErasView>;
  const container = window.document.getElementById('root')!;
  const root = createRoot(container);
  await act(async () => root.render(<MemoryRouter initialEntries={['/?view=eras&focus=eras']}><ErasView {...props} /><Location /></MemoryRouter>));
  const click = async (element: Element | null | undefined) => {
    expect(element).toBeTruthy();
    await act(async () => { element!.dispatchEvent(new window.Event('click', { bubbles: true })); });
  };
  const button = (label: string) => [...container.querySelectorAll('button')].find(row => row.textContent === label);
  return { container, onTimeline, click, button, onErasChanged: props.onErasChanged, unmount: async () => { await act(async () => root.unmount()); } };
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
    expect(ui.button('Add description')).toBeTruthy();
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
    for (const label of ['Create era', 'Edit era', 'Add description', 'Show all events']) expect(ui.button(label)).toBeUndefined();
    expect(ui.container.querySelector('details')).toBeNull();
    expect(ui.container.querySelector('[role="status"]')).toBeNull();
  } finally { await ui.unmount(); }
});

test.each([0, 6])('truncated expansion shows coverage alongside an empty result only (%i matches)', async (count) => {
  const ui = await mount(false, count, true);
  try {
    const events = ui.container.querySelector('[aria-label="Events in this era"]')!;
    if (count === 0) {
      expect(events.textContent).toContain('No matching events in this era.');
      expect(events.querySelector('[role="status"]')?.textContent).toContain('occurrence expansion limits apply');
    } else {
      expect(events.querySelector('[role="status"]')).toBeNull();
      expect(ui.button('Show all events')).toBeTruthy();
    }
  } finally { await ui.unmount(); }
});

test('saving an era awaits exactly one refresh before navigation and never edits projected wiki text', async () => {
  const ui = await mount(true, 0, false, 'Read-only wiki overview.');
  let completeRefresh!: () => void;
  const refreshing = new Promise<void>(resolve => { completeRefresh = resolve; });
  vi.mocked(ui.onErasChanged).mockReturnValue(refreshing);
  mocks.api.mockResolvedValue({ era: { ...era('saved-era', 1), slug: 'saved-era' } });
  try {
    await ui.click(ui.button('Edit era'));
    expect(mocks.editor.mock.calls.at(-1)?.[0].content).toBe('');
    const form = document.querySelector('dialog form')!;
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    const request = JSON.parse(mocks.api.mock.calls[0][1].body);
    expect(request.description).toBeNull();
    expect(request).not.toHaveProperty('overview');
    expect(ui.onErasChanged).toHaveBeenCalledOnce();
    expect(ui.container.querySelector('output')?.textContent).toBe('/');
    await act(async () => { completeRefresh(); });
    expect(ui.container.querySelector('output')?.textContent).toBe('/campaigns/archive/eras/saved-era');
    expect(ui.onErasChanged).toHaveBeenCalledOnce();
  } finally { completeRefresh(); await ui.unmount(); }
});

test('retrying after a create succeeds and refresh fails does not create another era', async () => {
  const ui = await mount(true, 0);
  vi.mocked(ui.onErasChanged).mockRejectedValueOnce(new Error('Refresh failed')).mockResolvedValueOnce(undefined);
  mocks.api.mockResolvedValue({ era: { ...era('saved-era', 1), slug: 'saved-era' } });
  try {
    await ui.click(ui.button('Create era'));
    const form = document.querySelector('dialog form')!;
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(mocks.api).toHaveBeenCalledOnce();
    expect(mocks.api.mock.calls[0][1].method).toBe('POST');
    expect(document.querySelector('dialog [role="alert"]')?.textContent).toBe('Refresh failed');
    expect(ui.container.querySelector('output')?.textContent).toBe('/');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(mocks.api).toHaveBeenCalledOnce();
    expect(ui.onErasChanged).toHaveBeenCalledTimes(2);
    expect(ui.container.querySelector('output')?.textContent).toBe('/campaigns/archive/eras/saved-era');
  } finally { await ui.unmount(); }
});
