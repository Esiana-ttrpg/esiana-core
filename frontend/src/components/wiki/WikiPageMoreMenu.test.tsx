import assert from 'node:assert/strict';
import test from 'node:test';
import { act } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { parseHTML } from 'linkedom';
import { AuthProvider } from '@/contexts/AuthContext';
import { WikiPageMoreMenu } from './WikiPageMoreMenu';

test('portfolio request survives menu dismissal, reports failures outside it, and supports retry', async (t) => {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  const restore: (() => void)[] = [];
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement,
    Event: window.Event, navigator: { userAgent: 'node' }, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  const { createRoot } = await import('react-dom/client');
  const container = window.document.getElementById('root')!;
  const root = createRoot(container);
  t.after(async () => { await act(async () => root.unmount()); for (const cleanup of restore) cleanup(); });
  let calls = 0;
  let finishRequest!: (response: Response) => void;
  t.mock.method(globalThis, 'fetch', async (url: unknown) => {
    if (String(url) === '/api/auth/me') return Response.json({ user: { id: 'reader' } });
    assert.equal(String(url), '/api/campaigns/archive/wiki/neris/add-to-portfolio');
    calls++;
    return new Promise<Response>((resolve) => { finishRequest = resolve; });
  });
  await act(async () => root.render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/campaigns/archive/wiki/neris']}>
        <Routes>
          <Route path="/campaigns/:campaignHandle/wiki/:pageId" element={
            <WikiPageMoreMenu portfolioCharacter={{ pageId: 'neris', characterName: 'Neris' }} isTagsHub={false}
              isDMUser={false} isPinned={false} canDeleteWikiPage={false} onTogglePin={() => {}} />
          } />
          <Route path="/characters/:id" element={<p>Portfolio destination</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  ));
  const click = async (selector: string) => {
    const button = container.querySelector(selector);
    assert.ok(button, selector);
    await act(async () => { button.dispatchEvent(new window.Event('click', { bubbles: true })); });
  };
  await click('[title="More actions"]');
  await click('[role="menuitem"]');
  assert.equal(calls, 1);
  await click('[aria-label="Close menu"]');
  assert.equal(container.querySelector('[role="menu"]'), null);
  assert.match(container.querySelector('[role="status"]')!.textContent ?? '', /Adding to Portfolio/);
  await click('[title="More actions"]');
  assert.ok(container.querySelector('[role="menuitem"][disabled]'));
  await click('[role="menuitem"]');
  assert.equal(calls, 1, 'reopening the menu must not permit a duplicate request');
  await click('[aria-label="Close menu"]');
  await act(async () => { finishRequest(Response.json({ error: 'Portfolio is unavailable. Try again.' }, { status: 503 })); });
  assert.equal(container.querySelector('[role="menu"]'), null);
  assert.match(container.querySelector('[role="alert"]')!.textContent ?? '', /Portfolio is unavailable/);
  assert.equal(container.querySelector('[role="status"]'), null);
  await click('[title="More actions"]');
  assert.ok(container.querySelector('[role="menuitem"]:not([disabled])'));
  await click('[role="menuitem"]');
  assert.equal(calls, 2);
  assert.equal(container.querySelector('[role="alert"]'), null, 'retry clears the previous error');
  await click('[aria-label="Close menu"]');
  await act(async () => { finishRequest(Response.json({ portfolioCharacter: { id: 'portfolio-neris' } })); });
  assert.equal(container.textContent, 'Portfolio destination');
});
