import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter } from 'react-router-dom';
import { OrganizationHubView } from './OrganizationHubView';

const fixture = vi.hoisted(() => ({ canCreate: true, fetchIndex: vi.fn() }));
vi.mock('@/contexts/WikiContext', () => ({
  useWiki: () => ({ campaignHandle: 'test', flatPages: [], refresh: vi.fn(), can: (capability: string) => capability === 'page.create' && fixture.canCreate }),
}));
vi.mock('@/lib/wiki', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/wiki')>(),
  fetchCategoryIndex: fixture.fetchIndex,
}));
vi.mock('@/lib/downtime', () => ({ fetchDowntimeHub: async () => ({}) }));
vi.mock('@/components/CreatePageModal', () => ({
  CreatePageModal: ({ open }: { open: boolean }) => open ? <div role="dialog">Create organization</div> : null,
}));

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

async function mount() {
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
    <OrganizationHubView campaignHandle="test" categoryPageId="organizations" />
  </MemoryRouter>));
  return { container, unmount: () => act(async () => root.unmount()) };
}

test('empty organizations retain the create action for authorized users', async () => {
  fixture.canCreate = true;
  fixture.fetchIndex.mockReset().mockResolvedValue({ children: [] });
  const { container, unmount } = await mount();
  try {
    expect(container.textContent).toContain('No entries in Organizations yet.');
    expect(container.textContent).toContain('Use Catalog Organization in the header');
    const create = [...container.querySelectorAll('button')].find(button => button.textContent === 'Catalog Organization');
    expect(create).toBeTruthy();
    await act(async () => create!.click());
    expect(container.querySelector('[role="dialog"]')?.textContent).toBe('Create organization');
  } finally { await unmount(); }
});

test('empty organizations do not invite users without page creation access', async () => {
  fixture.canCreate = false;
  fixture.fetchIndex.mockReset().mockResolvedValue({ children: [] });
  const { container, unmount } = await mount();
  try {
    expect(container.textContent).toContain('No entries in Organizations yet.');
    expect(container.textContent).not.toContain('Catalog Organization');
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  } finally { await unmount(); }
});

test('failed loads show an error and retry instead of an empty invitation', async () => {
  fixture.canCreate = true;
  fixture.fetchIndex.mockReset().mockRejectedValueOnce(new Error('Unable to load organizations'))
    .mockResolvedValueOnce({ children: [] });
  const { container, unmount } = await mount();
  try {
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Unable to load organizations');
    expect(container.textContent).not.toContain('No entries');
    expect(container.textContent).not.toContain('Catalog Organization');
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Try again')!.click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain('No entries in Organizations yet.');
    expect(container.textContent).toContain('Catalog Organization');
  } finally { await unmount(); }
});
