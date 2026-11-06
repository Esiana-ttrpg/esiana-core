import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter } from 'react-router-dom';
import { VisualAtlasPage } from './VisualAtlasPage';

const fixture = vi.hoisted(() => ({ fetchAtlas: vi.fn() }));
vi.mock('@/contexts/WikiContext', () => ({
  useWiki: () => ({ campaignHandle: 'test', flatPages: [] }),
}));
vi.mock('@/lib/visualAtlas', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/visualAtlas')>(),
  fetchVisualAtlas: fixture.fetchAtlas,
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
  await act(async () => root.render(<MemoryRouter><VisualAtlasPage /></MemoryRouter>));
  return { container, unmount: () => act(async () => root.unmount()) };
}

test('category buttons filter the atlas and announce the selected category', async () => {
  fixture.fetchAtlas.mockReset().mockResolvedValue({ campaignBanners: [], items: [
    { id: 'one', imageUrl: '/one.png', sourceKind: 'portrait', filter: 'characters', pageId: 'one', pageTitle: 'Ariadne' },
    { id: 'two', imageUrl: '/two.png', sourceKind: 'artwork', filter: 'locations', pageId: 'two', pageTitle: 'Moon Harbor' },
  ] });
  const { container, unmount } = await mount();
  try {
    const characters = [...container.querySelectorAll('button')].find(button => button.textContent === 'Characters')!;
    expect(container.textContent).toContain('Moon Harbor');
    await act(async () => characters.click());
    expect(characters.getAttribute('aria-pressed')).toBe('true');
    expect(container.textContent).toContain('Ariadne');
    expect(container.textContent).not.toContain('Moon Harbor');
  } finally { await unmount(); }
});

test('a failed atlas request can be retried', async () => {
  fixture.fetchAtlas.mockReset().mockRejectedValueOnce(new Error('Atlas unavailable'))
    .mockResolvedValueOnce({ campaignBanners: [], items: [] });
  const { container, unmount } = await mount();
  try {
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Atlas unavailable');
    await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === 'Try again')!.click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).toContain('Visual Atlas collects images');
  } finally { await unmount(); }
});
