import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter } from 'react-router-dom';
import { EntityBrowserView } from './WikiIndexView';

const fixture = vi.hoisted(() => ({ canCreate: true, fetchIndex: vi.fn() }));
vi.mock('@/contexts/WikiContext', () => ({
  useWiki: () => ({ campaignHandle: 'test', flatPages: [], refresh: vi.fn(), campaign: { role: 'GAMEMASTER' },
    can: (capability: string) => capability === 'page.create' && fixture.canCreate }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user' } }) }));
vi.mock('@/hooks/useWikiCampaignPolicy', () => ({ useElevatedNarrativeView: () => true }));
vi.mock('@/lib/wiki', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/wiki')>(), fetchCategoryIndex: fixture.fetchIndex,
}));
vi.mock('@/components/CreatePageModal', () => ({
  CreatePageModal: ({ open }: { open: boolean }) => open ? <div role="dialog">Create page</div> : null,
}));

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

async function mount(categoryTitle: string) {
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
  await act(async () => root.render(<MemoryRouter>
    <EntityBrowserView categoryPageId="category" categoryTitle={categoryTitle} />
  </MemoryRouter>));
  return { container, unmount: () => act(async () => root.unmount()) };
}

test.each(['Objects', 'Families', 'Rules/Resources', 'Locations'])('%s shows a permission-aware empty state', async (category) => {
  fixture.canCreate = false;
  fixture.fetchIndex.mockReset().mockResolvedValue({ children: [] });
  const ui = await mount(category);
  try {
    expect(ui.container.querySelector('h1')?.closest('header')?.className).toContain('workspace-header--compact');
    expect(ui.container.textContent).toContain('No entries');
    expect([...ui.container.querySelectorAll('button')].some(button => button.textContent?.startsWith('Create '))).toBe(false);
    expect(ui.container.textContent).not.toContain('in the header to add');
  } finally { await ui.unmount(); }
});

test('authorized users can open creation from the toolbar', async () => {
  fixture.canCreate = true;
  fixture.fetchIndex.mockReset().mockResolvedValue({ children: [] });
  const ui = await mount('Objects');
  try {
    expect(ui.container.textContent).toContain('in the header to add');
    const create = [...ui.container.querySelectorAll('button')].find(button => button.textContent?.startsWith('Create '));
    expect(create).toBeTruthy();
    await act(async () => create!.click());
    expect(ui.container.querySelector('[role="dialog"]')).toBeTruthy();
  } finally { await ui.unmount(); }
});

test('a failed index load shows an error and a working retry, not an empty catalog', async () => {
  fixture.canCreate = true;
  fixture.fetchIndex.mockReset().mockRejectedValueOnce(new Error('Index unavailable')).mockResolvedValueOnce({ children: [] });
  const ui = await mount('Families');
  try {
    expect(ui.container.querySelector('[role="alert"]')?.textContent).toContain('Index unavailable');
    expect(ui.container.textContent).not.toContain('No entries');
    expect(ui.container.textContent).not.toContain('Create Family');
    await act(async () => [...ui.container.querySelectorAll('button')].find(button => button.textContent === 'Try again')!.click());
    expect(ui.container.querySelector('[role="alert"]')).toBeNull();
    expect(ui.container.textContent).toContain('No entries');
  } finally { await ui.unmount(); }
});
