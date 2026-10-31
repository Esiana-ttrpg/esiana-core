import { expect, test, vi } from 'vitest';
import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { parseHTML } from 'linkedom';
import { WikiProvider, useWiki } from './WikiContext';

const mocks = vi.hoisted(() => ({ tree: vi.fn(), mounts: vi.fn() }));
vi.mock('@/lib/wiki', () => ({ fetchWikiTreePayload: mocks.tree, fetchPersonalPins: async () => [], flattenWikiTree: (tree: unknown[]) => tree }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useCampaignPolicy', () => ({ useCampaignPolicy: () => ({ can: () => false }) }));

function Document() {
  useEffect(() => { mocks.mounts(); }, []);
  return <input defaultValue="Unsaved draft" />;
}
function Workspace() {
  const { loading, refresh } = useWiki();
  return <><button onClick={() => void refresh()}>Refresh</button>{loading ? <p>Loading</p> : <Document />}</>;
}

test.each([{ tree: [] }, { tree: [{ id: 'page', title: 'Chronicle', children: [] }] }])('refresh preserves the mounted document after initial loading, including empty wikis (%j)', async ({ tree }) => {
  mocks.mounts.mockClear();
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  const restore: (() => void)[] = [];
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  let finish!: (value: unknown) => void;
  mocks.tree.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const container = window.document.getElementById('root')!;
  const root = createRoot(container);
  try {
    await act(async () => root.render(<MemoryRouter initialEntries={['/campaigns/archive/pages']}><Routes><Route path="/campaigns/:campaignHandle/pages" element={<WikiProvider><Workspace /></WikiProvider>} /></Routes></MemoryRouter>));
    expect(container.textContent).toContain('Loading');
    await act(async () => { finish({ tree }); });
    const input = container.querySelector('input')!;
    input.value = 'Keep my draft';
    mocks.tree.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    await act(async () => { container.querySelector('button')!.dispatchEvent(new window.Event('click', { bubbles: true })); });
    expect(container.textContent).not.toContain('Loading');
    expect(container.querySelector('input')).toBe(input);
    await act(async () => { finish({ tree }); });
    expect(container.querySelector('input')?.value).toBe('Keep my draft');
    expect(mocks.mounts).toHaveBeenCalledOnce();
  } finally {
    await act(async () => root.unmount());
    for (const reset of restore.reverse()) reset();
  }
});
