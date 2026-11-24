import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter } from 'react-router-dom';
import { JournalLibraryTab } from './JournalLibraryTab';

const fixture = vi.hoisted(() => ({ fetchLibrary: vi.fn(), canCreate: true }));
const translate = vi.hoisted(() => (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key);
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: translate }) }));
vi.mock('@/contexts/WikiContext', () => ({
  useWiki: () => ({ campaign: { isCampaignOwner: false }, can: (capability: string) => capability === 'page.create' && fixture.canCreate }),
}));
vi.mock('@/lib/journals', () => ({
  fetchJournalLibrary: fixture.fetchLibrary, fetchJournalPublication: vi.fn(),
  deleteJournalPublication: vi.fn(), releaseJournalPublication: vi.fn(),
}));
vi.mock('@/components/journal/CreatePublicationModal', () => ({
  CreatePublicationModal: ({ open }: { open: boolean }) => open ? <div role="dialog">Create publication</div> : null,
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
  await act(async () => root.render(<MemoryRouter><JournalLibraryTab campaignHandle="test" /></MemoryRouter>));
  return { container, window, unmount: () => act(async () => root.unmount()) };
}

test('Refine applies and resets filters without resetting sort or creation', async () => {
  fixture.canCreate = true;
  fixture.fetchLibrary.mockReset().mockImplementation(async (_campaign: string, query: { type?: string }) => ({
    items: [
      { id: 'a', title: 'Harbor Dispatch', type: 'dispatch', tags: [] },
      { id: 'b', title: 'Lantern Letter', type: 'letter', tags: [] },
    ].filter(item => !query.type || item.type === query.type), nextCursor: null,
  }));
  const ui = await mount();
  try {
    expect(ui.container.textContent).toContain('Harbor Dispatch');
    expect(ui.container.textContent).toContain('Lantern Letter');
    const sort = ui.container.querySelector('select[aria-label="journal.library.sortLabel"]')!;
    await act(async () => {
      Object.defineProperty(sort, 'value', { configurable: true, value: 'oldest' });
      sort.dispatchEvent(new ui.window.Event('change', { bubbles: true }));
    });
    await act(async () => [...ui.container.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Refine')!.click());
    const refine = ui.container.querySelector('[role="dialog"][aria-label="Refine results"]')!;
    expect(refine.className).toContain('max-sm:fixed');
    const type = refine.querySelector('select[aria-label="journal.library.filterType"]')!;
    await act(async () => {
      Object.defineProperty(type, 'value', { configurable: true, value: 'letter' });
      type.dispatchEvent(new ui.window.Event('change', { bubbles: true }));
    });
    expect(fixture.fetchLibrary).toHaveBeenLastCalledWith('test', expect.objectContaining({ type: 'letter', sort: 'oldest' }));
    expect(ui.container.textContent).not.toContain('Harbor Dispatch');
    expect(ui.container.textContent).toContain('Lantern Letter');
    await act(async () => [...ui.container.querySelectorAll('button')].find(button => button.textContent === 'Reset refine')!.click());
    expect(fixture.fetchLibrary).toHaveBeenLastCalledWith('test', expect.objectContaining({ type: undefined, sort: 'oldest' }));
    expect(ui.container.textContent).toContain('Harbor Dispatch');
    await act(async () => [...ui.container.querySelectorAll('button')].find(button => button.textContent === 'journal.library.newPublication')!.click());
    expect(ui.container.textContent).toContain('Create publication');
  } finally { await ui.unmount(); }
});

test('publication creation remains unavailable without the effective grant', async () => {
  fixture.canCreate = false;
  fixture.fetchLibrary.mockReset().mockResolvedValue({ items: [], nextCursor: null });
  const ui = await mount();
  try {
    expect([...ui.container.querySelectorAll('button')].some(button => button.textContent === 'journal.library.newPublication')).toBe(false);
    expect(ui.container.textContent).toContain('journal.library.sectionReleased');
    expect(ui.container.textContent).toContain('journal.library.sectionUpcoming');
  } finally { await ui.unmount(); }
});
