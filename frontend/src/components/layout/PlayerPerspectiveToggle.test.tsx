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
  const [perspective, setPerspective] = useState<'dm' | 'party' | 'public'>('dm');
  const visible = perspective === 'public' ? 'Public quest' : perspective === 'party' ? 'Public quest' : 'GM quest';
  return (
    <div>
      <PlayerPerspectiveToggle
        value={perspective}
        onChange={setPerspective}
        publicLabel="Public"
        ariaLabel="Adventure view perspective"
      />
      <p data-testid="content">{visible}</p>
      <p data-testid="state">{perspective}</p>
    </div>
  );
}

test('Public stays selected even when visible content matches Player', async () => {
  const ui = await mount(<Harness />);
  try {
    const buttons = () =>
      Array.from(ui.container.querySelectorAll<HTMLButtonElement>('button'));
    const [gm, player, pub] = buttons();

    expect(gm.getAttribute('aria-pressed')).toBe('true');
    expect(player.getAttribute('aria-pressed')).toBe('false');
    expect(pub.getAttribute('aria-pressed')).toBe('false');

    await act(async () => {
      player.click();
    });
    expect(ui.container.querySelector('[data-testid="state"]')?.textContent).toBe('party');
    expect(ui.container.querySelector('[data-testid="content"]')?.textContent).toBe('Public quest');
    expect(buttons()[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons()[2].getAttribute('aria-pressed')).toBe('false');

    await act(async () => {
      buttons()[2].click();
    });
    expect(ui.container.querySelector('[data-testid="state"]')?.textContent).toBe('public');
    expect(ui.container.querySelector('[data-testid="content"]')?.textContent).toBe('Public quest');
    expect(buttons()[0].getAttribute('aria-pressed')).toBe('false');
    expect(buttons()[1].getAttribute('aria-pressed')).toBe('false');
    expect(buttons()[2].getAttribute('aria-pressed')).toBe('true');

    await act(async () => {
      buttons()[0].click();
    });
    expect(ui.container.querySelector('[data-testid="state"]')?.textContent).toBe('dm');
    expect(buttons()[0].getAttribute('aria-pressed')).toBe('true');
  } finally {
    await ui.unmount();
  }
});
