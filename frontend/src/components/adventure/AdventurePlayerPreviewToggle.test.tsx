import { afterEach, expect, test, vi } from 'vitest';
import { act, useState, type ReactNode } from 'react';
import { parseHTML } from 'linkedom';
import type { AdventurePreviewPerspective } from '@/lib/adventurePreview';

const workspace = {
  active: true,
  isDMUser: true,
  perspective: 'dm' as AdventurePreviewPerspective,
  setPerspective: (_next: AdventurePreviewPerspective) => {},
  playerPreview: false,
  publicPreview: false,
  publicPreviewEligible: false,
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

test('Adventure toggle keeps Public selected after GM and Player', async () => {
  const { AdventurePlayerPreviewToggle } = await import('./AdventurePlayerPreviewToggle');

  function Harness() {
    const [perspective, setPerspective] = useState<AdventurePreviewPerspective>('dm');
    workspace.perspective = perspective;
    workspace.setPerspective = setPerspective;
    workspace.playerPreview = perspective !== 'dm';
    workspace.publicPreview = perspective === 'public';
    return (
      <div>
        <AdventurePlayerPreviewToggle />
        <p data-testid="state">{perspective}</p>
      </div>
    );
  }

  const ui = await mount(<Harness />);
  try {
    const press = async (label: string) => {
      const button = Array.from(ui.container.querySelectorAll('button')).find(
        (node) => node.textContent === label,
      );
      expect(button).toBeTruthy();
      await act(async () => {
        button!.click();
      });
    };

    await press('Player');
    expect(ui.container.querySelector('[data-testid="state"]')?.textContent).toBe('party');
    await press('Public');
    expect(ui.container.querySelector('[data-testid="state"]')?.textContent).toBe('public');
    const publicButton = Array.from(ui.container.querySelectorAll('button')).find(
      (node) => node.textContent === 'Public',
    );
    expect(publicButton?.getAttribute('aria-pressed')).toBe('true');
    await press('GM');
    expect(ui.container.querySelector('[data-testid="state"]')?.textContent).toBe('dm');
  } finally {
    await ui.unmount();
  }
});
