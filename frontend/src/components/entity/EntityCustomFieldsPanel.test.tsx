import assert from 'node:assert/strict';
import test from 'node:test';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { EntityCustomFieldsPanel } from './EntityCustomFieldsPanel';
import { EntityFieldManager } from './EntityFieldManager';
import type { CharacterFieldDescriptor, CharacterPageDescriptor } from '@shared/characterPages';

const field = (patch: Partial<CharacterFieldDescriptor>): CharacterFieldDescriptor => ({
  id: 'field', key: 'field', label: 'Memory', type: 'STRING', value: 'A shared history', origin: 'CUSTOM',
  pageId: null, displayOrder: 0, validation: {}, capabilities: { readable: true, writable: true, deletable: true, placeable: true },
  createdAt: '2026-01-01', updatedAt: '2026-01-01', ...patch,

});

test('native field rendering, sheet selection, edit permissions and box layout', async (t) => {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  const preferences = new Map<string, string>();
  const globals: Record<string, unknown> = { window, document: window.document, HTMLElement: window.HTMLElement, Event: window.Event,
    navigator: { userAgent: 'node' }, IS_REACT_ACT_ENVIRONMENT: true,
    localStorage: { getItem: (key: string) => preferences.get(key) ?? null, setItem: (key: string, value: string) => preferences.set(key, value) },
  };
  const restore: (() => void)[] = [];
  window.document.oninput = null;
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  const { createRoot } = await import('react-dom/client');
  const container = window.document.getElementById('root')!;
  const root = createRoot(container);
  t.after(async () => { await act(async () => root.unmount()); for (const cleanup of restore) cleanup(); });
  let rows = [field({ id: 'zero', label: 'Count', type: 'NUMBER', value: 0, displayOrder: 2 }),
    field({ id: 'false', label: 'Revealed', type: 'BOOLEAN', value: false, displayOrder: 1 }),
    field({ id: 'null', label: 'Unknown', type: 'STRING', value: null, pageId: 'core:overview' }),
    field({ id: 'json', label: 'Links', type: 'JSON', value: { allies: ['Juniper'] } }),
    field({ id: 'other', label: 'Other sheet', pageId: 'app-sheet' }),
    field({ id: 'hidden', label: 'Unreadable', capabilities: { readable: false, writable: false, deletable: false } })];
  const updates: unknown[] = [];
  let posted: any;
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init?: RequestInit) => {
    if (init?.method === 'POST') {
      posted = JSON.parse(String(init.body));
      return Response.json({ field: field({ ...posted, id: 'new-user-field' }) });
    }
    if (init?.method === 'PUT') {
      const patch = JSON.parse(String(init.body)); updates.push(patch);
      const id = String(_url).split('/').pop();
      const updated = { ...rows.find((row) => row.id === id)!, ...patch };
      return Response.json({ field: updated });
    }
    return Response.json({ fields: rows });
  });
  const render = async (pageId: string | null, canEdit = false, layout: 'sidebox' | 'topbox' = 'sidebox') => {
    await act(async () => root.render(<EntityCustomFieldsPanel key={String(pageId) + canEdit + layout} campaignHandle="glass-archive" entityPageId="neris" activePageId={pageId} canEdit={canEdit} layout={layout}><p>Canonical narrative</p></EntityCustomFieldsPanel>));
  };
  await t.test('Overview displays both legacy destinations, false, zero, JSON and empty values in order', async () => {
    await render(null);
    const text = container.textContent ?? '';
    for (const value of ['Not set', 'No', '0', 'Juniper', 'Canonical narrative']) assert.ok(text.includes(value), value);
    assert.ok(text.indexOf('Revealed') < text.indexOf('Count'));
    assert.ok(!text.includes('Other sheet')); assert.ok(!text.includes('Unreadable'));
    assert.equal(container.querySelectorAll('input, textarea, select').length, 0);
    assert.ok(container.querySelector('dl dt')); assert.ok(container.querySelector('dl dd'));
  });
  await t.test('assigned app sheets display their fields and keep the original content', async () => {
    await render('app-sheet');
    assert.ok(container.textContent?.includes('Other sheet')); assert.ok(!container.textContent?.includes('Revealed'));
    assert.ok(container.textContent?.includes('Canonical narrative'));
  });
  await t.test('sidebox uses a right desktop column with mobile stacking; topbox spans the content', async () => {
    await render(null);
    assert.match(container.innerHTML, /md:grid-cols-\[minmax\(0,1fr\)_20rem\]/);
    assert.match(container.innerHTML, /md:col-start-2 md:row-start-1/);
    await render(null, false, 'topbox');
    assert.match(container.innerHTML, /data-field-box-layout="topbox"/);
    assert.doesNotMatch(container.innerHTML, /md:grid-cols-/);
  });
  await t.test('editable rows expose typed controls, while a read-only app value remains text', async () => {
    rows = [...rows, field({ id: 'readonly', label: 'App truth', origin: 'API', capabilities: { readable: true, writable: false, deletable: true, placeable: true } })];
    await render(null, true);
    assert.ok(container.querySelector('input[type="number"]')); assert.ok(container.querySelector('textarea'));
    assert.ok(container.querySelector('select[aria-label="Revealed"]'));
    assert.ok(!container.querySelector('input[aria-label="App truth"]'));
    const selector = container.querySelector('select[aria-label="Information box layout"]')!;
    await act(async () => {
      (selector.querySelector('option[value="topbox"]') as HTMLOptionElement).selected = true;
      selector.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    assert.match(container.innerHTML, /data-field-box-layout="topbox"/);
  });
  await t.test('boolean edits preserve a real false value and submit typed values', async () => {
    await render(null, true, 'topbox');
    const select = container.querySelector('select[aria-label="Revealed"]')!;
    await act(async () => {
      (select.querySelector('option[value="true"]') as HTMLOptionElement).selected = true;
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
    await act(async () => select.closest('form')!.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    assert.deepEqual(updates.at(-1), { value: true });
  });
  await t.test('JSON edits save structured data and invalid JSON reports an error without saving', async () => {
    await render(null, true, 'topbox');
    const textarea = container.querySelector('textarea[aria-label="Links"]') as HTMLTextAreaElement;
    const fill = async (value: string) => {
      await act(async () => {
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(textarea), 'value')!.set!.call(textarea, value);
        textarea.dispatchEvent(new window.Event('input', { bubbles: true }));
      });
      await act(async () => textarea.closest('form')!.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    };
    await fill('{"clues":["silver"]}');
    assert.deepEqual(updates.at(-1), { value: { clues: ['silver'] } });
    const count = updates.length;
    await fill('{invalid');
    assert.equal(updates.length, count);
    assert.ok(container.querySelector('[role="alert"]'));
  });
  await t.test('new user fields default to the current sheet independently of API ownership', async () => {
    const pages = [{ id: 'app-sheet', title: 'App sheet', coreKey: undefined }] as CharacterPageDescriptor[];
    await act(async () => root.render(<EntityFieldManager campaignHandle="glass-archive" entityPageId="neris" pages={pages} activePageId="app-sheet" onClose={() => {}} />));
    const form = container.querySelector('form')!;
    const pageSelector = form.querySelectorAll('select')[1]!;
    assert.equal(pageSelector.value, 'app-sheet');
    assert.ok(container.querySelector('select[aria-label="Page for App truth"]:not([disabled])'));
    const nameInput = form.querySelector('input')!;
    nameInput.setAttribute('type', 'text'); // Match the browser's implicit input type in this DOM implementation.
    await act(async () => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(nameInput), 'value')!.set!.call(nameInput, 'New discovery');
      nameInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    await act(async () => form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })));
    assert.deepEqual(posted, { label: 'New discovery', type: 'STRING', pageId: 'app-sheet' });
    assert.ok(container.textContent?.includes('User-created'));

  });
  await t.test('an empty sheet leaves its canonical content visible', async () => {
    rows = [];
    await render('empty-sheet');
    assert.equal(container.querySelector('[aria-label="Custom fields"]'), null);
    assert.ok(container.textContent?.includes('Canonical narrative'));
  });
});
