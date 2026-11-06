import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter } from 'react-router-dom';
import { OrganizationHubView } from './OrganizationHubView';

vi.mock('@/contexts/WikiContext', () => ({
  useWiki: () => ({ campaignHandle: 'test', flatPages: [], refresh: vi.fn() }),
}));
vi.mock('@/lib/wiki', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/wiki')>(),
  fetchCategoryIndex: async () => ({ children: [] }),
}));
vi.mock('@/lib/downtime', () => ({ fetchDowntimeHub: async () => ({}) }));
vi.mock('@/components/CreatePageModal', () => ({
  CreatePageModal: ({ open }: { open: boolean }) => open ? <div role="dialog">Create organization</div> : null,
}));

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

test('empty organizations retain the create action and explain how to get started', async () => {
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
    await act(async () => root.render(<MemoryRouter>
      <OrganizationHubView campaignHandle="test" categoryPageId="organizations" />
    </MemoryRouter>));
    expect(container.textContent).toContain('No entries in Organizations yet.');
    expect(container.textContent).toContain('Use Catalog Organization in the header');
    const create = [...container.querySelectorAll('button')].find(button => button.textContent === 'Catalog Organization');
    expect(create).toBeTruthy();
    await act(async () => create!.click());
    expect(container.querySelector('[role="dialog"]')?.textContent).toBe('Create organization');
  } finally { await act(async () => root.unmount()); }
});
