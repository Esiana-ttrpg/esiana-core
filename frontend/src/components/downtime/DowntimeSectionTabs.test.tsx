import { afterEach, expect, test } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { DowntimeSectionTabs } from './DowntimeSectionTabs';
import { readDowntimeSectionFromSearch } from '@/lib/downtimeLayout';

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

function Navigation() {
  const location = useLocation();
  return <><DowntimeSectionTabs basePath="/downtime" activeSection={readDowntimeSectionFromSearch(location.search)} />
    <span data-testid="location">{location.pathname}{location.search}</span></>;
}

test('highlights the selected query section and keyboard navigation opens the highlighted option', async () => {
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
  try {
    await act(async () => root.render(<MemoryRouter initialEntries={['/downtime?section=ledger']}><Navigation /></MemoryRouter>));
    const tabs = [...container.querySelectorAll('[role="tab"]')];
    expect(tabs.filter(tab => tab.getAttribute('aria-selected') === 'true').map(tab => tab.textContent)).toEqual(['Ledger']);
    expect(tabs.filter(tab => tab.className.includes('border-accent')).map(tab => tab.textContent)).toEqual(['Ledger']);
    const trigger = container.querySelector('button[aria-haspopup="listbox"]')!;
    await act(async () => trigger.dispatchEvent(new window.Event('click', { bubbles: true })));
    const focusedOption = [...container.querySelectorAll('[role="option"]')].find(option => option.textContent === 'Projects')!;
    await act(async () => focusedOption.dispatchEvent(new window.Event('focusin', { bubbles: true })));
    const enter = new window.Event('keydown', { bubbles: true, cancelable: true });
    Object.defineProperty(enter, 'key', { value: 'Enter' });
    await act(async () => focusedOption.dispatchEvent(enter));
    expect(enter.defaultPrevented).toBe(false);
    // LinkeDOM does not perform the browser's native Enter-to-click default action.
    await act(async () => {
      const click = new window.Event('click', { bubbles: true, cancelable: true });
      Object.defineProperty(click, 'button', { value: 0 });
      focusedOption.dispatchEvent(click);
    });
    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe('/downtime?section=projects');
    await act(async () => trigger.dispatchEvent(new window.Event('click', { bubbles: true })));
    await act(async () => {
      const event = new window.Event('keydown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'key', { value: 'ArrowUp' });
      trigger.dispatchEvent(event);
    });
    const highlighted = [...container.querySelectorAll('[role="option"]')].find(option => option.className.includes('bg-elevated/80'));
    const expectedHref = highlighted?.getAttribute('href');
    expect(expectedHref).toBeTruthy();
    await act(async () => {
      const event = new window.Event('keydown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'key', { value: 'Enter' });
      trigger.dispatchEvent(event);
    });
    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe(expectedHref);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  } finally { await act(async () => root.unmount()); }
});
