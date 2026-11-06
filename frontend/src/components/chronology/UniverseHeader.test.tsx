import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter } from 'react-router-dom';
import { UniverseHeader } from './UniverseHeader';
import { ChronologyCreateEventDialog } from './ChronologyCreateEventDialog';

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

async function mount(canCreateEvent: boolean) {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  for (const [key, value] of Object.entries({ window, document: window.document, Node: window.Node,
    HTMLElement: window.HTMLElement, Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  const container = window.document.getElementById('root')!;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(container);
  const create = vi.fn();
  await act(async () => root.render(<MemoryRouter initialEntries={['/chronology?view=timeline&track=calendar-1']}>
    <UniverseHeader campaignHandle="test" activeView="timeline" canCreateEvent={canCreateEvent}
      onCreateEvent={create} settingsHref="/settings" activeCalendarId="calendar-1"
      clockPills={[{ id: 'calendar-1', label: 'Harbor calendar' }, { id: 'calendar-2', label: 'Other calendar' }]} />
  </MemoryRouter>));
  return { container, create, unmount: () => act(async () => root.unmount()) };
}

test('keeps chronology navigation and clock context while placing Create last', async () => {
  const ui = await mount(true);
  try {
    const nav = ui.container.querySelector('nav[aria-label="Chronology views"]')!;
    expect([...nav.querySelectorAll('a')].map(link => link.textContent)).toEqual(['Calendar', 'Timeline', 'Eras', 'Events', 'Campaign feed']);
    expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe('Timeline');
    expect(ui.container.textContent).toContain('Harbor calendar');
    expect(ui.container.textContent).not.toContain('Other calendar');
    const settings = ui.container.querySelector('a[aria-label="Chronology Engine Settings"]')!;
    const create = [...ui.container.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Create Event')!;
    expect(settings.nextElementSibling).toBe(create);
    await act(async () => create.click());
    expect(ui.create).toHaveBeenCalledOnce();
  } finally { await ui.unmount(); }
});

test('does not expose event creation without the create capability', async () => {
  const ui = await mount(false);
  try {
    expect(ui.container.textContent).not.toContain('Create Event');
    expect(ui.container.querySelector('a[aria-label="Chronology Engine Settings"]')).toBeTruthy();
    expect(ui.create).not.toHaveBeenCalled();
  } finally { await ui.unmount(); }
});

test('event creation explains the missing calendar and can be closed', async () => {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  for (const [key, value] of Object.entries({ window, document: window.document, Node: window.Node,
    HTMLElement: window.HTMLElement, Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  const container = window.document.getElementById('root')!;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(container);
  const close = vi.fn();
  try {
    await act(async () => root.render(<MemoryRouter><ChronologyCreateEventDialog campaignHandle="test"
      calendars={[]} categories={[]} events={[]} initialDate={null} onClose={close} onMutated={() => {}} /></MemoryRouter>));
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('A calendar is required');
    await act(async () => container.querySelector('button')!.click());
    expect(close).toHaveBeenCalledOnce();
  } finally { await act(async () => root.unmount()); }
});
