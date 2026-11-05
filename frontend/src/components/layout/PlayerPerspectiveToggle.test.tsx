import { afterEach, expect, test } from 'vitest';
import { act, useState, type ReactNode } from 'react';
import { parseHTML } from 'linkedom';
import {
  PlayerPerspectiveToggle,
} from './PlayerPerspectiveToggle';

const restore: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of restore.splice(0).reverse()) cleanup();
});

async function mount(children: ReactNode) {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  for (const [key, value] of Object.entries({
    window,
    document: window.document,
    HTMLElement: window.HTMLElement,
    Event: window.Event,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => {
      if (previous) Object.defineProperty(globalThis, key, previous);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
  const container = window.document.getElementById('root')!;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(container);
  await act(async () => root.render(children));
  return { container, unmount: () => act(async () => root.unmount()) };
}

function Harness() {
  const [perspective, setPerspective] = useState<'dm' | 'party'>('dm');
  return <><PlayerPerspectiveToggle value={perspective} onChange={setPerspective} />
    <p data-testid="state">{perspective}</p></>;
}

test('switches between GM and Party', async () => {
  const ui = await mount(<Harness />);
  try {
    const buttons = [...ui.container.querySelectorAll('button')];
    expect(buttons.map(button => button.textContent)).toEqual(['GM', 'Party']);
    await act(async () => buttons[1].click());
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(ui.container.querySelector('[data-testid="state"]')?.textContent).toBe('party');
    await act(async () => buttons[0].click());
    expect(ui.container.querySelector('[data-testid="state"]')?.textContent).toBe('dm');
  } finally { await ui.unmount(); }
});