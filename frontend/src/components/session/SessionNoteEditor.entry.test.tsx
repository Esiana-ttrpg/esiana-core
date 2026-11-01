import { afterEach, expect, test, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter } from 'react-router-dom';
import { SessionNoteEditor } from './SessionNoteEditor';
import type { WikiPageLayoutPayload } from '@/types/wiki';

const mocks = vi.hoisted(() => ({ refresh: vi.fn(async () => {}), save: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('@/contexts/WikiContext', () => ({ useWiki: () => ({ campaign: { name: 'Glasswater' }, tree: [], flatPages: [], pageIdByTitle: new Map(), refresh: mocks.refresh }) }));
vi.mock('@/hooks/useWikiCampaignPolicy', () => ({ useElevatedNarrativeView: () => false }));
vi.mock('@/lib/wiki', () => ({ updateSessionNotePage: mocks.save, saveWikiPageMetadata: vi.fn() }));
vi.mock('@/components/wiki/WikiTipTapEditor', () => ({ WikiTipTapEditor: () => <textarea data-testid="own-note-editor" /> }));
vi.mock('@/components/wiki/WikiMarkdown', () => ({ WikiMarkdown: () => <p>Note preview</p> }));
vi.mock('@/components/session/SessionCombinedInlineView', () => ({ SessionCombinedInlineView: () => <p>Combined notes</p> }));
vi.mock('@/components/session/SessionNotesSidebar', () => ({ SessionNotesSidebar: () => null }));
vi.mock('@/components/session/SessionAudioPanel', () => ({ SessionAudioPanel: () => null }));
vi.mock('@/components/layout/WikiWorkspaceShell', () => ({ WikiWorkspaceShell: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); vi.clearAllMocks(); });

test.each(['me', 'another-author'])('dashboard edit intent only opens the authenticated author’s note (%s)', async authorId => {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  const { createRoot } = await import('react-dom/client');
  const container = window.document.getElementById('root')!;
  const root = createRoot(container);
  const page = { id: 'author-note', title: 'My notes', createdAt: '2026-10-24T00:00:00Z', updatedAt: '2026-10-24T00:00:00Z',
    metadata: { sessionNoteAuthorId: authorId }, blocks: [],
  } as unknown as WikiPageLayoutPayload;
  try {
    await act(async () => root.render(<MemoryRouter initialEntries={['/notes/session-3?notes=mine&edit=1']}>
      <SessionNoteEditor campaignHandle="review" pageId={page.id} pageData={page} timelinePointId="session-3" onPageUpdated={vi.fn()} />
    </MemoryRouter>));
    expect(Boolean(container.querySelector('[data-testid="own-note-editor"]'))).toBe(authorId === 'me');
    expect(mocks.save).not.toHaveBeenCalled();
  } finally { await act(async () => root.unmount()); }
});
