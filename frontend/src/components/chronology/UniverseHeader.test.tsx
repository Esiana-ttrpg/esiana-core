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

test('event creation uses the native modal and Escape closes the unavailable state', async () => {
  const { window } = parseHTML('<html><body><button id="background">Background</button><div id="root"></div></body></html>');
  for (const [key, value] of Object.entries({ window, document: window.document, Node: window.Node,
    HTMLElement: window.HTMLElement, Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  let active: HTMLElement | null = window.document.getElementById('background') as HTMLElement;
  Object.defineProperty(window.document, 'activeElement', { configurable: true, get: () => active });
  for (const [method, value] of Object.entries({
    focus(this: HTMLElement) { active = this; },
    getClientRects() { return [{ width: 1, height: 1 }]; },
    showModal(this: HTMLElement) { this.setAttribute('open', ''); this.querySelector<HTMLElement>('button')?.focus(); },
    close(this: HTMLElement) { this.removeAttribute('open'); },
  })) {
    const previous = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, method);
    Object.defineProperty(window.HTMLElement.prototype, method, { configurable: true, writable: true, value });
    restore.push(() => previous ? Object.defineProperty(window.HTMLElement.prototype, method, previous) : Reflect.deleteProperty(window.HTMLElement.prototype, method));
  }
  Object.defineProperty(window, 'history', { configurable: true, value: { state: null, go: vi.fn() } });
  const container = window.document.getElementById('root')!;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(container);
  const close = vi.fn();
  try {
    await act(async () => root.render(<MemoryRouter><ChronologyCreateEventDialog campaignHandle="test"
      calendars={[]} categories={[]} events={[]} initialDate={null} onClose={close} onMutated={() => {}} /></MemoryRouter>));
    const dialog = window.document.querySelector('dialog')!;
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.textContent).toContain('A calendar is required');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    for (const shift of [false, true]) {
      const tab = new window.Event('keydown', { bubbles: true, cancelable: true });
      Object.defineProperties(tab, { key: { value: 'Tab' }, shiftKey: { value: shift } });
      await act(async () => dialog.querySelector('button')!.dispatchEvent(tab));
      expect(tab.defaultPrevented).toBe(true);
      expect(dialog.contains(window.document.activeElement)).toBe(true);
    }
    await act(async () => dialog.dispatchEvent(new window.Event('cancel', { bubbles: false, cancelable: true })));
    expect(close).toHaveBeenCalledOnce();
    await act(async () => dialog.querySelector('button')!.click());
    expect(close).toHaveBeenCalledTimes(2);
  } finally { await act(async () => root.unmount()); }
});
