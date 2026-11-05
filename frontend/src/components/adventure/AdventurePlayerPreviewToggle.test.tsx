import { afterEach, expect, test, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { parseHTML } from 'linkedom';
import type { AdventurePreviewPerspective } from '@/lib/adventurePreview';

const workspace = {
  active: true,
  isDMUser: true,
  perspective: 'dm' as AdventurePreviewPerspective,
  setPerspective: (_next: AdventurePreviewPerspective) => {},
  playerPreview: false,
};

vi.mock('@/contexts/AdventureWorkspaceContext', () => ({
  useOptionalAdventureWorkspace: () => workspace,
}));

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

test('Adventure preview options stay unavailable until server projections are verified', async () => {
  const { AdventurePlayerPreviewToggle } = await import('./AdventurePlayerPreviewToggle');
  const setPerspective = vi.fn();
  workspace.perspective = 'dm';
  workspace.setPerspective = setPerspective;
  const ui = await mount(<AdventurePlayerPreviewToggle />);
  try {
    const buttons = Array.from(ui.container.querySelectorAll('button'));
    expect(buttons.map(button => button.textContent)).toEqual(['GM', 'Party']);
    expect(buttons[1].disabled).toBe(true);
    expect(ui.container.textContent).toContain('temporarily unavailable');
    await act(async () => buttons[1].click());
    expect(setPerspective).not.toHaveBeenCalled();
  } finally { await ui.unmount(); }
});
