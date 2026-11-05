import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { Link, MemoryRouter } from 'react-router-dom';
import { AdventureView } from './AdventureView';

vi.mock('@/contexts/AdventureWorkspaceContext', () => ({
  useAdventureWorkspace: () => ({ perspective: 'gm', isDMUser: false, playerPreview: false }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'manager' } }) }));
vi.mock('@/lib/workspacePersistence', () => ({
  readCampaignWorkspaceState: () => ({}), patchStoryFilters: vi.fn(), patchStoryView: vi.fn(), patchThreadsLens: vi.fn(),
}));
vi.mock('@/components/wiki/indexBrowse/CategoryHubShell', () => ({
  CategoryHubShell: ({ actions, belowToolbar, children }: { actions: React.ReactNode; belowToolbar: React.ReactNode; children: React.ReactNode }) =>
    <div><header>{actions}</header>{belowToolbar}{children}</div>,
}));
vi.mock('@/components/adventure/StoryViewTabs', () => ({ StoryViewTabs: () => null }));
vi.mock('@/components/adventure/ContinuityDrawer', () => ({ ContinuityDrawer: () => null }));
vi.mock('@/components/adventure/StorySection', async () => {
  const { useEffect, createElement } = await import('react');
  const sceneAction = createElement('button', null, 'New Scene');
  return { StorySection: ({ activeView, onHeaderActionsChange }: { activeView: string; onHeaderActionsChange: (node: React.ReactNode) => void }) => {
    useEffect(() => {
      if (activeView !== 'scenes') return;
      onHeaderActionsChange(sceneAction);
      return () => onHeaderActionsChange(null);
    }, [activeView, onHeaderActionsChange]);
    return <Link to="?view=unresolved">Unresolved</Link>;
  } };
});

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

test('keeps registered section actions on initial load and clears them when leaving', async () => {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  for (const [key, value] of Object.entries({ window, document: window.document, Node: window.Node,
    HTMLElement: window.HTMLElement, Event: window.Event, MouseEvent: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
  const container = window.document.getElementById('root')!;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(container);
  try {
    await act(async () => root.render(<MemoryRouter initialEntries={['/adventures?view=scenes']}>
      <AdventureView campaignHandle="test" categoryPageId="quests" />
    </MemoryRouter>));
    expect(container.querySelector('header')?.textContent).toContain('New Scene');
    await act(async () => {
      const event = new window.Event('click', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'button', { value: 0 });
      container.querySelector('a')!.dispatchEvent(event);
    });
    expect(container.querySelector('header')?.textContent).not.toContain('New Scene');
  } finally { await act(async () => root.unmount()); }
});
