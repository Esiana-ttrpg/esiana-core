import { afterEach, expect, test, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { parseHTML } from 'linkedom';
import { EventsDirectory } from './EventsDirectory';
import { ChronologyDocumentNavigation } from './ChronologyDocumentNavigation';
import { ChronologyPageLink } from './ChronologyPageLink';
import type { ChronologyTimelineBundle } from '@/lib/chronologyApi';

const mocks = vi.hoisted(() => ({ create: vi.fn(), api: vi.fn(), refresh: vi.fn(), chronology: vi.fn() }));
vi.mock('@/lib/wiki', () => ({ createWikiPage: mocks.create }));
vi.mock('@/lib/chronologyApi', () => ({ fetchChronologyTimeline: mocks.chronology }));
vi.mock('@/lib/api', () => ({ apiFetch: mocks.api }));
vi.mock('@/contexts/WikiContext', () => ({ useWiki: () => ({
  campaignHandle: 'florence', can: () => true, refresh: mocks.refresh,
  flatPages: [{ id: 'page-1', title: 'The Fall of Florence', workspace: 'PAGES', pathKey: 'the-fall-of-florence' }],
}) }));
const cleanup: (() => void)[] = [];

test('chronology link request failures show an error and can be retried', async () => {
  mocks.chronology.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ baseEvents: [{ id: 'event', slug: 'riverlight', title: 'Riverlight', wikiPageId: 'page-1' }], eras: [] });
  const ui = await mount(<ChronologyDocumentNavigation pageId="page-1" kind="event" />);
  try {
    expect(ui.container.querySelector('[role="alert"]')?.textContent).toContain('Unable to load chronology links');
    await ui.click(ui.container.querySelector('button')!);
    expect(mocks.chronology).toHaveBeenCalledTimes(2);
    expect(ui.container.querySelector('[role="alert"]')).toBeNull();
    expect(ui.container.textContent).toContain('Event: Riverlight');
  } finally { await ui.unmount(); }
});
afterEach(() => { for (const restore of cleanup.splice(0).reverse()) restore(); vi.clearAllMocks(); });
function Location() { return <output>{useLocation().pathname}</output>; }
async function mount(children: ReactNode) {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    cleanup.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  const container = window.document.getElementById('root')!;
  const root = createRoot(container);
  await act(async () => root.render(<MemoryRouter>{children}<Location /></MemoryRouter>));
  return { container, click: async (node: Element) => act(async () => { node.dispatchEvent(new Event('click', { bubbles: true })); }), unmount: () => act(async () => root.unmount()) };
}

test('Events directory distinguishes accessible pages and keeps one row per recurring definition', async () => {
  const bundle = { baseEvents: [
    { id: 'fall', slug: 'fall-of-florence', title: 'The Fall of Florence', importance: 'MAJOR', wikiPageId: 'page-1' },
    { id: 'market', slug: 'weekly-market', title: 'Weekly Market', importance: 'NOTICE', isRepeating: true },
    { id: 'private', slug: 'discovery', title: 'A Discovery', importance: 'MINOR', wikiPageId: 'inaccessible-page' },
  ] } as unknown as ChronologyTimelineBundle;
  const ui = await mount(<EventsDirectory campaignHandle="florence" bundle={bundle} />);
  try {
    expect(ui.container.querySelectorAll('li')).toHaveLength(3);
    expect(ui.container.querySelector('li a')?.getAttribute('href')).toBe('/campaigns/florence/events/fall-of-florence');
    expect(ui.container.textContent).toContain('Recurring event');
    const select = ui.container.querySelector('select')!;
    await act(async () => {
      for (const option of select.querySelectorAll('option')) option.selected = option.value === 'pages';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(ui.container.querySelectorAll('li')).toHaveLength(1);
    expect(ui.container.querySelector('li')?.textContent).toContain('The Fall of Florence');
  } finally { await ui.unmount(); }
});

test('Create page uses the normal wiki API with an explicit event link and opens its readable page route', async () => {
  mocks.create.mockResolvedValue({ id: 'new-page', title: 'Juniper’s Celebration', workspace: 'EVENTS', pathKey: 'junipers-celebration' });
  const ui = await mount(<ChronologyPageLink type="events" id="event-definition" title="Juniper’s Celebration" description="A celebration." />);
  try {
    expect(ui.container.textContent).toContain('No event page');
    const button = [...ui.container.querySelectorAll('button')].find(node => node.textContent === 'Create page')!;
    await ui.click(button);
    expect(mocks.create).toHaveBeenCalledWith('florence', expect.objectContaining({ chronologyEventId: 'event-definition', title: 'Juniper’s Celebration' }));
    expect(mocks.create.mock.calls[0][1]).not.toHaveProperty('id');
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(ui.container.querySelector('output')?.textContent).toBe('/campaigns/florence/event-pages/junipers-celebration');
  } finally { await ui.unmount(); }
});

test('view-only chronology details retain Open page and hide page management', async () => {
  const ui = await mount(<ChronologyPageLink type="eras" id="ashes" title="Age of Ashes" pageId="page-1" canManage={false} />);
  try {
    expect(ui.container.querySelector('a')?.textContent).toBe('Open page');
    expect(ui.container.querySelector('details')).toBeNull();
    expect(ui.container.querySelector('button')).toBeNull();
  } finally { await ui.unmount(); }
});

test('wiki documents expose separate authorized chronology and wiki navigation', async () => {
  mocks.chronology.mockResolvedValue({ baseEvents: [{ id: 'definition', title: 'Renamed Celebration', slug: 'renamed-celebration', wikiPageId: 'page-1' }], eras: [] });
  const ui = await mount(<ChronologyDocumentNavigation kind="event" pageId="page-1" />);
  try {
    const destinations = [...ui.container.querySelectorAll('a')].map(link => link.getAttribute('href'));
    expect(destinations).toEqual(['/campaigns/florence/event-pages', '/campaigns/florence/events/renamed-celebration']);
  } finally { await ui.unmount(); }
});

test('unlinked wiki documents retain their normal wiki directory without inventing an event link', async () => {
  mocks.chronology.mockResolvedValue({ baseEvents: [], eras: [] });
  const ui = await mount(<ChronologyDocumentNavigation kind="event" pageId="page-1" />);
  try {
    expect(ui.container.querySelectorAll('a')).toHaveLength(1);
    expect(ui.container.querySelector('a')?.getAttribute('href')).toBe('/campaigns/florence/event-pages');
  } finally { await ui.unmount(); }
});
