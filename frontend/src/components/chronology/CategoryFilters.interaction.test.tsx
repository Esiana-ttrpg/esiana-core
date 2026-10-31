import { afterEach, expect, test, vi } from 'vitest';
import { act, type ComponentProps, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { parseHTML } from 'linkedom';
import { CampaignFeedView } from './CampaignFeedView';
import { WidescreenCalendarView, type CalendarSession } from './WidescreenCalendarView';

vi.mock('./ChronologyEventSidebar', () => ({ ChronologyEventSidebar: () => null }));
vi.mock('./ChronologyEventInlineDetail', () => ({ ChronologyEventInlineDetail: () => null }));
const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });
function Location() { return <output data-url>{useLocation().search}</output>; }
async function mount(children: ReactNode, url = '/') {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  const container = window.document.getElementById('root')!;
  const root = createRoot(container);
  const render = (child: ReactNode) => act(async () => root.render(<MemoryRouter initialEntries={[url]}>{child}<Location /></MemoryRouter>));
  await render(children);
  return { container, render, unmount: () => act(async () => root.unmount()) };
}
const category = { id: 'discovery', campaignId: 'campaign', name: 'Archives', icon: 'compass', color: '#123456' };

test('feed resets deleted URL categories and still renders entries with the metadata separator', async () => {
  const props = {
    campaignHandle: 'campaign', onOverlaySaved: vi.fn(), timeBundle: { calendars: [] },
    chronologyBundle: { categories: [category], calendars: [], occurrences: [], baseEvents: [] },
    bundle: { window: { from: '0', to: '1440' }, truncation: { capped: false }, entries: [{
      entryId: 'entry', domain: 'world_event', source: { entityId: 'event' }, projection: { visible: true },
      display: { title: 'An archive discovery', dateLabel: 'Day 1', summary: null }, instant: { epochMinute: '0' }, links: [],
      feed: { datePrecision: 'day', referenceDay: '0', category },
    }] },
  } as unknown as ComponentProps<typeof CampaignFeedView>;
  const ui = await mount(<CampaignFeedView {...props} />, '/?feedCategory=discovery');
  try {
    expect(ui.container.querySelector('[data-feed-entry]')).not.toBeNull();
    await ui.render(<CampaignFeedView {...props} chronologyBundle={{ ...props.chronologyBundle!, categories: [] }} />);
    expect(ui.container.querySelector('[data-url]')?.textContent).toBe('?feedCategory=all');
    expect(ui.container.querySelector('[data-feed-entry]')).not.toBeNull();
    const metadata = ui.container.querySelector('[data-feed-entry] p')?.textContent;
    expect(metadata).toContain('\u00b7 Archives');
    expect(metadata).not.toContain('? Archives');
  } finally { await ui.unmount(); }
});

test('calendar refresh clears deleted category IDs from its session and retains virtual filters', async () => {
  for (const selected of ['discovery', 'all', 'uncategorized']) {
    const session: CalendarSession = { snapshot: { calendarId: null, year: 1, month: 0, day: null, occurrenceId: null, importance: { NOTICE: true, MINOR: true, MAJOR: true }, category: selected } };
    const props = { campaignHandle: 'campaign', session, timeBundle: { calendars: [] }, chronologyBundle: { calendars: [], occurrences: [] }, categories: [category], baseEvents: [], canManage: false } as unknown as ComponentProps<typeof WidescreenCalendarView>;
    const ui = await mount(<WidescreenCalendarView {...props} />);
    try {
      expect(session.snapshot?.category).toBe(selected);
      await ui.render(<WidescreenCalendarView {...props} categories={[]} />);
      expect(session.snapshot?.category).toBe(selected === 'discovery' ? 'all' : selected);
    } finally { await ui.unmount(); }
  }
});
