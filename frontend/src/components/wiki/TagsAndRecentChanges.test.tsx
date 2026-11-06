import { afterEach, expect, test, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TagsHubView } from './TagsHubView';
import { RecentChangesPage } from '@/pages/RecentChangesPage';

const fixture = vi.hoisted(() => ({ fetchTags: vi.fn(), fetchActivity: vi.fn() }));
vi.mock('@/contexts/WikiContext', () => ({
  useWiki: () => ({ campaign: { role: 'GAMEMASTER' }, flatPages: [] }),
}));
vi.mock('@/lib/wiki', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/wiki')>(), fetchTagsHub: fixture.fetchTags,
}));
vi.mock('@/lib/campaignActivityApi', () => ({ listCampaignActivity: fixture.fetchActivity }));

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

async function mount(path: string, child: ReactNode) {
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
  await act(async () => root.render(<MemoryRouter initialEntries={[`/campaigns/test/${path}`]}>
    <Routes><Route path={`/campaigns/:campaignHandle/${path}`} element={child} /></Routes>
  </MemoryRouter>));
  return { container, unmount: () => act(async () => root.unmount()) };
}

test('Tags distinguishes a failed request from an empty catalog and retries', async () => {
  fixture.fetchTags.mockReset().mockRejectedValueOnce(new Error('Tags unavailable'))
    .mockResolvedValueOnce({ tags: [], pages: [], selectedTagId: null });
  const ui = await mount('tags', <TagsHubView campaignHandle="test" initialTagId="tag-1" />);
  try {
    expect(ui.container.querySelector('[role="alert"]')?.textContent).toContain('Tags unavailable');
    expect(ui.container.textContent).not.toContain('No tags yet');
    expect(ui.container.textContent).not.toContain('Select a tag');
    await act(async () => [...ui.container.querySelectorAll('button')].find(button => button.textContent === 'Try again')!.click());
    expect(fixture.fetchTags).toHaveBeenLastCalledWith('test', 'tag-1');
    expect(ui.container.querySelector('[role="alert"]')).toBeNull();
    expect(ui.container.textContent).toContain('No tags yet');
    expect(ui.container.textContent).toContain('Select a tag');
  } finally { await ui.unmount(); }
});

test('selecting a tag loads its pages and retries that selection on failure', async () => {
  const tag = { id: 'tag-1', name: 'lore', label: 'Lore', icon: null, iconAssetUrl: null, color: null, pageCount: 1 };
  fixture.fetchTags.mockReset().mockResolvedValueOnce({ tags: [tag], pages: [], selectedTagId: null })
    .mockRejectedValueOnce(new Error('Tag pages unavailable'))
    .mockResolvedValueOnce({ tags: [tag], pages: [{ id: 'page-1', title: 'Lantern history', snippet: '' }], selectedTagId: tag.id });
  const ui = await mount('tags', <TagsHubView campaignHandle="test" />);
  try {
    const tagButton = [...ui.container.querySelectorAll('button')].find(button => button.textContent?.includes('Lore'));
    expect(tagButton).toBeTruthy();
    await act(async () => tagButton!.click());
    expect(ui.container.querySelector('[role="alert"]')?.textContent).toContain('Tag pages unavailable');
    await act(async () => [...ui.container.querySelectorAll('button')].find(button => button.textContent === 'Try again')!.click());
    expect(fixture.fetchTags).toHaveBeenLastCalledWith('test', 'tag-1');
    expect(ui.container.textContent).toContain('Lantern history');
  } finally { await ui.unmount(); }
});

test('Recent Changes uses Refresh to retry without reporting a failed request as empty activity', async () => {
  fixture.fetchActivity.mockReset().mockRejectedValueOnce(new Error('Activity unavailable'))
    .mockResolvedValueOnce({ activity: [], pagination: { currentPage: 1, totalPages: 1, totalCount: 0 } });
  const ui = await mount('recent-changes', <RecentChangesPage />);
  try {
    expect(ui.container.querySelector('[role="alert"]')?.textContent).toContain('Activity unavailable');
    expect(ui.container.textContent).not.toContain('No changes yet');
    await act(async () => [...ui.container.querySelectorAll('button')].find(button => button.textContent === 'Refresh')!.click());
    expect(ui.container.querySelector('[role="alert"]')).toBeNull();
    expect(ui.container.textContent).toContain('No changes yet');
  } finally { await ui.unmount(); }
});
