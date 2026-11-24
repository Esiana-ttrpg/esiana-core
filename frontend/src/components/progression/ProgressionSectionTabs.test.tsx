import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { ProgressionSectionTabs } from './ProgressionSectionTabs';
import { readProgressionSectionFromSearch } from '@/lib/progressionLayout';

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

function Navigation() {
  const location = useLocation();
  return <><ProgressionSectionTabs basePath="/progression" activeSection={readProgressionSectionFromSearch(location.search)} />
    <span data-testid="location">{location.pathname}{location.search}</span></>;
}

test('mobile keyboard navigation selects the highlighted section and respects focused options', async () => {
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
    await act(async () => root.render(<MemoryRouter initialEntries={['/progression?section=trajectories']}><Navigation /></MemoryRouter>));
    const trigger = container.querySelector('button[aria-haspopup="listbox"]')!;
    await act(async () => trigger.dispatchEvent(new window.Event('click', { bubbles: true })));
    const nextOption = [...container.querySelectorAll<HTMLElement>('[role="option"]')].find(option => option.textContent?.includes('Developments'))!;
    const focusNext = vi.spyOn(nextOption, 'focus');
    await act(async () => {
      const event = new window.Event('keydown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'key', { value: 'ArrowDown' });
      trigger.dispatchEvent(event);
    });
    expect(focusNext).toHaveBeenCalledOnce();
    await act(async () => {
      const event = new window.Event('keydown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'key', { value: 'Enter' });
      trigger.dispatchEvent(event);
    });
    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe('/progression?section=developments');
    await act(async () => trigger.dispatchEvent(new window.Event('click', { bubbles: true })));
    const history = [...container.querySelectorAll('[role="option"]')].find(option => option.textContent?.includes('History'))!;
    await act(async () => history.dispatchEvent(new window.Event('focusin', { bubbles: true })));
    expect(history.className).toContain('bg-elevated/80');
    const enter = new window.Event('keydown', { bubbles: true, cancelable: true });
    Object.defineProperty(enter, 'key', { value: 'Enter' });
    await act(async () => history.dispatchEvent(enter));
    expect(enter.defaultPrevented).toBe(false);
    // LinkeDOM does not synthesize a button click for Enter.
    await act(async () => history.dispatchEvent(new window.Event('click', { bubbles: true })));
    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe('/progression?section=history');
  } finally { await act(async () => root.unmount()); }
});
