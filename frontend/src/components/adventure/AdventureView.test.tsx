import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { Link, MemoryRouter } from 'react-router-dom';
import { AdventureView } from './AdventureView';

vi.mock('@/contexts/AdventureWorkspaceContext', () => ({
  useAdventureWorkspace: () => ({ perspective: 'gm', isDMUser: true, playerPreview: false }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'manager' } }) }));
vi.mock('@/contexts/WikiContext', () => ({ useWiki: () => ({ flatPages: [], refresh: vi.fn() }) }));
const fetchHub = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock('@/lib/adventure', () => ({ fetchAdventureHub: fetchHub, patchStoryboardLayout: vi.fn() }));
vi.mock('@/lib/workspacePersistence', () => ({
  readCampaignWorkspaceState: () => ({}), patchStoryFilters: vi.fn(), patchStoryView: vi.fn(), patchThreadsLens: vi.fn(),
  patchAdventureStoryboardLens: vi.fn(),
}));
vi.mock('@/components/wiki/indexBrowse/CategoryHubShell', () => ({
  CategoryHubShell: ({ actions, belowToolbar, children }: { actions: React.ReactNode; belowToolbar: React.ReactNode; children: React.ReactNode }) =>
    <div><header>{actions}</header>{belowToolbar}{children}</div>,
}));
vi.mock('@/components/adventure/StoryViewTabs', () => ({ StoryViewTabs: () => null }));
vi.mock('@/components/adventure/ContinuityDrawer', () => ({ ContinuityDrawer: () => null }));
vi.mock('@/components/adventure/AdventurePlayerPreviewToggle', () => ({ AdventurePlayerPreviewToggle: () => null }));
vi.mock('@/components/adventure/StoryboardSection', () => ({ StoryboardSection: () => null }));
vi.mock('@/components/adventure/SceneTimelineSection', () => ({ SceneTimelineSection: () => null }));
vi.mock('@/components/progression/SceneEditorCard', () => ({ SceneEditorCard: () => null }));
vi.mock('@/components/adventure/CreateSceneModal', () => ({ CreateSceneModal: () => null }));
vi.mock('@/components/creativeDrift/CreativeDriftContent', () => ({ CreativeDriftContent: () => <p>Unresolved</p> }));

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

test.each(['scenes', 'storyboard'])('clears the real %s section action when navigating away', async (view) => {
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
    fetchHub.mockClear();
    await act(async () => root.render(<MemoryRouter initialEntries={[`/adventures?view=${view}`]}>
      <AdventureView campaignHandle="test" categoryPageId="quests" />
      <Link to="?view=unresolved">Go to unresolved</Link>
    </MemoryRouter>));
    expect(container.querySelector('header')?.textContent).toContain('New Scene');
    expect(fetchHub).toHaveBeenCalledWith('test', expect.objectContaining({ section: 'scenes' }));
    if (view === 'storyboard') {
      expect(container.textContent).toContain('Ready scenes');
      expect(fetchHub).toHaveBeenCalledWith('test', expect.objectContaining({ section: 'sessions' }));
    } else {
      expect(container.textContent).toContain('No scenes yet');
    }
    await act(async () => {
      const event = new window.Event('click', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'button', { value: 0 });
      [...container.querySelectorAll('a')].find(link => link.textContent === 'Go to unresolved')!.dispatchEvent(event);
    });
    expect(container.querySelector('header')?.textContent).not.toContain('New Scene');
    expect(container.textContent).toContain('Unresolved');
  } finally { await act(async () => root.unmount()); }
});
