import { afterEach, expect, test, vi } from 'vitest';
import { act, useState, type ReactNode } from 'react';
import { parseHTML } from 'linkedom';
import { QuickLinksEditor } from './QuickLinksEditor';
import { parseDashboardQuickLinks, type DashboardQuickLinkEntry } from '@shared/dashboardQuickLinkCatalog';

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

async function mount(children: ReactNode) {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  window.document.oninput = null;
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  const container = window.document.getElementById('root')!;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(container);
  await act(async () => root.render(children));
  return { container, unmount: () => act(async () => root.unmount()) };
}

async function type(input: HTMLInputElement, value: string) {
  input.setAttribute('type', 'text');
  await act(async () => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

test('external resources can be added, reordered, edited, validated, and removed alongside internal links', async () => {
  const changed = vi.fn();
  function Editor() {
    const [entries, setEntries] = useState<DashboardQuickLinkEntry[]>(['maps', 'sessionNotes']);
    return <QuickLinksEditor entries={entries} internalLabel={key => key} onChange={next => {
      const persisted = parseDashboardQuickLinks(JSON.parse(JSON.stringify(next)))!;
      changed(persisted); setEntries(persisted);
    }} />;
  }
  const ui = await mount(<Editor />);
  const click = async (label: string) => act(async () => {
    ui.container.querySelector(`button[aria-label="${label}"]`)!.dispatchEvent(new Event('click', { bubbles: true }));
  });
  const submit = async () => act(async () => { ui.container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  const inputs = () => [...ui.container.querySelectorAll('input')] as HTMLInputElement[];
  try {
    await type(inputs()[0], 'Campaign guide');
    await type(inputs()[1], 'https://example.com/guide');
    await submit();
    expect(changed).toHaveBeenCalledTimes(1);
    const saved = changed.mock.lastCall![0][2];
    expect(saved).toMatchObject({ label: 'Campaign guide', url: 'https://example.com/guide' });
    await click('Move Campaign guide earlier');
    expect(changed.mock.lastCall![0]).toEqual(['maps', saved, 'sessionNotes']);
    await click('Edit Campaign guide');
    await type(inputs()[1], 'javascript:alert(1)');
    await submit();
    expect(changed).toHaveBeenCalledTimes(2);
    expect(ui.container.querySelector('[role="alert"]')?.textContent).toContain('HTTP or HTTPS');
    await type(inputs()[0], 'Shared atlas');
    await type(inputs()[1], 'https://example.com/atlas');
    await submit();
    expect(changed.mock.lastCall![0][1]).toMatchObject({ id: saved.id, label: 'Shared atlas', url: 'https://example.com/atlas' });
    await click('Remove Shared atlas');
    expect(changed.mock.lastCall![0]).toEqual(['maps', 'sessionNotes']);
  } finally { await ui.unmount(); }
});
