import { afterEach, expect, test, vi } from 'vitest';
import { act } from 'react';
import { parseHTML } from 'linkedom';
import { MemoryRouter } from 'react-router-dom';
import { StoryViewTabs } from './StoryViewTabs';

vi.mock('@/hooks/useWikiCampaignPolicy', () => ({ useElevatedNarrativeView: (value: boolean) => value }));

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

async function mount(isDMUser: boolean) {
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
  await act(async () => root.render(<MemoryRouter initialEntries={['/campaigns/test/adventure?view=threads']}>
    <StoryViewTabs basePath="/campaigns/test/adventure" activeView="threads" isDMUser={isDMUser} />
  </MemoryRouter>));
  return { container, unmount: () => act(async () => root.unmount()) };
}

test('marks only the selected story view and preserves its query navigation', async () => {
  const ui = await mount(true);
  try {
    const tabs = [...ui.container.querySelectorAll('[role="tab"]')];
    expect(tabs.filter(tab => tab.getAttribute('aria-selected') === 'true').map(tab => tab.textContent)).toEqual(['Threads']);
    expect(tabs.filter(tab => tab.className.includes('bg-accent/15')).map(tab => tab.textContent)).toEqual(['Threads']);
    expect(tabs.find(tab => tab.textContent === 'Scenes')?.getAttribute('href')).toContain('view=scenes');
    await act(async () => ui.container.querySelector('button[aria-haspopup="listbox"]')!.dispatchEvent(new Event('click', { bubbles: true })));
    const options = [...ui.container.querySelectorAll('[role="option"]')];
    expect(options.filter(option => option.className.includes('font-medium')).map(option => option.textContent)).toEqual(['Threads']);
  } finally { await ui.unmount(); }
});

test('keeps GM-only views out of player navigation', async () => {
  const ui = await mount(false);
  try {
    const labels = [...ui.container.querySelectorAll('[role="tab"]')].map(tab => tab.textContent);
    expect(labels).toContain('Threads');
    expect(labels).not.toContain('Scenes');
    expect(labels).not.toContain('Storyboard');
    expect(labels).not.toContain('Investigation');
  } finally { await ui.unmount(); }
});
