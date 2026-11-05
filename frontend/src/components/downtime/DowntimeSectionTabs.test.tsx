import { afterEach, expect, test } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { DowntimeSectionTabs } from './DowntimeSectionTabs';

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

function Navigation() {
  const location = useLocation();
  return <><DowntimeSectionTabs basePath="/downtime" activeSection={location.search.includes('ledger') ? 'ledger' : null} />
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
    await act(async () => {
      const event = new window.Event('keydown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'key', { value: 'ArrowUp' });
      window.document.dispatchEvent(event);
    });
    const highlighted = [...container.querySelectorAll('[role="option"]')].find(option => option.className.includes('bg-elevated/80'));
    const expectedHref = highlighted?.getAttribute('href');
    expect(expectedHref).toBeTruthy();
    await act(async () => {
      const event = new window.Event('keydown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'key', { value: 'Enter' });
      window.document.dispatchEvent(event);
    });
    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe(expectedHref);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  } finally { await act(async () => root.unmount()); }
});
