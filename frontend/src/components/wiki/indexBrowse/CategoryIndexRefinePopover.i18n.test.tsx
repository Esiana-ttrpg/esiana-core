import { afterEach, expect, test } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import french from '@/i18n/fr/common.json';
import { CategoryIndexRefinePopover } from './CategoryIndexRefinePopover';

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

test('Refine labels follow the selected UI language', async () => {
  const i18n = createInstance();
  await i18n.init({ lng: 'fr', resources: { fr: { translation: french } }, keySeparator: false });
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
    await act(async () => root.render(<I18nextProvider i18n={i18n}><CategoryIndexRefinePopover
      facetDefs={[]} refineState={{}} children={[]} categoryTitle="Journals" onRefineChange={() => {}}
      customBody={<p>Type</p>} activeCount={1} onResetRefine={() => {}} /></I18nextProvider>));
    const trigger = container.querySelector('button')!;
    expect(trigger.textContent).toContain('Affiner');
    await act(async () => trigger.click());
    expect(container.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe('Affiner les résultats');
    expect(container.textContent).toContain('Réinitialiser les filtres');
  } finally { await act(async () => root.unmount()); }
});
