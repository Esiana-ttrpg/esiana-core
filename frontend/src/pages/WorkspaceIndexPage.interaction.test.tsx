import { expect, test, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { parseHTML } from 'linkedom';
import { WorkspaceIndexPage } from './WorkspaceIndexPage';

vi.mock('react-i18next', async importOriginal => ({ ...await importOriginal<typeof import('react-i18next')>(), useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/contexts/WikiContext', () => ({ useWiki: () => ({ loading: false,
  resolvePageId: () => undefined, resolvePageIdBySystemKey: () => undefined,
  flatPages: [
    { id: 'event-page', title: 'Visible event account', workspace: 'EVENTS', pathKey: 'event-account', templateType: 'DEFAULT', parentId: 'hidden-folder' },
    { id: 'era-page', title: 'Visible era account', workspace: 'ERAS', pathKey: 'era-account', templateType: 'DEFAULT', parentId: 'hidden-folder' },
    { id: 'other-page', title: 'Unrelated notes', workspace: 'PAGES', pathKey: 'notes', templateType: 'DEFAULT' },
  ],
}) }));

test.each(['event', 'era'])('the %s workspace lists authorized authored pages when its root is unavailable', async kind => {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  const restore: (() => void)[] = [];
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  const container = window.document.getElementById('root')!;
  const root = createRoot(container);
  try {
    await act(async () => root.render(<MemoryRouter initialEntries={[`/campaigns/archive/${kind}-pages`]}><Routes><Route path="/campaigns/:campaignHandle/:workspace" element={<WorkspaceIndexPage />} /></Routes></MemoryRouter>));
    expect(container.querySelectorAll('a')).toHaveLength(1);
    expect(container.querySelector('a')?.textContent).toBe(`Visible ${kind} account`);
    expect(container.querySelector('a')?.getAttribute('href')).toBe(`/campaigns/archive/${kind}-pages/${kind}-account`);
    expect(container.textContent).not.toContain('hidden-folder');
    expect(container.textContent).not.toContain('Unrelated notes');
  } finally {
    await act(async () => root.unmount());
    for (const reset of restore.reverse()) reset();
  }
});
