import { expect, test, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { parseHTML } from 'linkedom';
import { WikiProvider } from '@/contexts/WikiContext';
import { QuestHubView } from './QuestHubView';

const mocks = vi.hoisted(() => ({ tree: vi.fn(), hub: vi.fn() }));
vi.mock('@/lib/wiki', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/wiki')>()),
  fetchWikiTreePayload: mocks.tree,
  fetchPersonalPins: async () => [],
  fetchQuestHub: mocks.hub,
}));
vi.mock('@/lib/timeTrackingApi', () => ({ fetchTimeTracking: async () => ({}) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useCampaignPolicy', () => ({ useCampaignPolicy: () => ({ can: () => false }) }));
vi.mock('@/hooks/useCampaignActor', () => ({ useCampaignActor: ({ previewAsPlayer }: { previewAsPlayer: boolean }) => ({ previewAsPlayer, isElevated: () => true }) }));
vi.mock('@/components/quest/QuestCard', () => ({ QuestCard: ({ node }: { node: { title: string } }) => <p>{node.title}</p> }));
vi.mock('@/components/quest/CreateQuestModal', () => ({ CreateQuestModal: () => null }));
vi.mock('@/components/wiki/indexBrowse/CategoryIndexToolbar', () => ({ CategoryIndexToolbar: () => null }));

test('a keyed Party QuestHubView ignores a manager response delivered after the Party response', async () => {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  const restore: (() => void)[] = [];
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  let resolveManager!: (value: unknown) => void;
  let resolveParty!: (value: unknown) => void;
  mocks.tree.mockReset().mockResolvedValue({ tree: [], campaign: { role: 'GAMEMASTER' } });
  mocks.hub.mockReset()
    .mockReturnValueOnce(new Promise(resolve => { resolveManager = resolve; }))
    .mockReturnValueOnce(new Promise(resolve => { resolveParty = resolve; }));
  const payload = (previewAsPlayer: boolean, title: string) => ({
    category: { id: 'quests', title: 'Quests', parentId: null, visibility: 'PUBLIC', updatedAt: '', systemCategoryKey: null },
    previewAsPlayer,
    quests: [{ id: title, title, parentId: 'quests', visibility: 'PUBLIC', createdAt: '', updatedAt: '', snippet: '', quest: { status: 'available', type: 'main' }, location: null, progressNote: null, tags: [], progress: { completed: 0, total: 0 }, recentActivity: [], references: {}, children: [] }],
  });
  const container = window.document.getElementById('root')!;
  const root = createRoot(container);
  const app = (preview: boolean) => <MemoryRouter initialEntries={['/campaigns/archive/adventures']}><Routes>
    <Route path="/campaigns/:campaignHandle/adventures" element={<WikiProvider key={String(preview)} previewAsPlayer={preview}><QuestHubView campaignHandle="archive" categoryPageId="quests" embedded playerPreview={preview} /></WikiProvider>} />
  </Routes></MemoryRouter>;
  try {
    await act(async () => root.render(app(false)));
    await act(async () => root.render(app(true)));
    await act(async () => { resolveParty(payload(true, 'Shared quest')); });
    expect(container.textContent).toContain('Shared quest');
    await act(async () => { resolveManager(payload(false, 'Hidden quest sentinel')); });
    expect(container.textContent).toContain('Shared quest');
    expect(container.textContent).not.toContain('Hidden quest sentinel');
  } finally {
    await act(async () => root.unmount());
    for (const reset of restore.reverse()) reset();
  }
});
