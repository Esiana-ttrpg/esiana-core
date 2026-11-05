import { afterEach, expect, test, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { parseHTML } from 'linkedom';
import { WorkspaceActionBar } from './WorkspaceActionBar';

const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); });

async function mount(children: ReactNode) {
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
  await act(async () => root.render(children));
  return { container, window, unmount: () => act(async () => root.unmount()) };
}

test('places optional context and existing controls before the create action', async () => {
  const create = vi.fn();
  const ui = await mount(<WorkspaceActionBar title="Locations" audience={<button>Party</button>}
    refine={<button>Refine</button>} create={{ label: 'New location', onClick: create }} />);
  try {
    expect(ui.container.textContent).toContain('Locations');
    const buttons = [...ui.container.querySelectorAll('button')];
    expect(buttons.map(button => button.textContent)).toEqual(['Party', 'Refine', 'New location']);
    await act(async () => buttons[2].click());
    expect(create).toHaveBeenCalledOnce();
  } finally { await ui.unmount(); }
});

test('creation menu dispatches the selected action and closes', async () => {
  const create = vi.fn();
  const upload = vi.fn();
  const ui = await mount(<WorkspaceActionBar create={{ label: 'Create', actions: [
    { label: 'New page', onClick: create }, { label: 'Upload', onClick: upload },
  ] }} />);
  try {
    const trigger = ui.container.querySelector('button')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await act(async () => trigger.click());
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const buttons = [...ui.container.querySelectorAll('button')];
    await act(async () => buttons[2].click());
    expect(upload).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(ui.container.querySelector('[role="group"]')).toBeNull();
    await act(async () => trigger.click());
    await act(async () => {
      const event = new ui.window.Event('keydown', { bubbles: true });
      Object.defineProperty(event, 'key', { value: 'Escape' });
      ui.window.document.dispatchEvent(event);
    });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  } finally { await ui.unmount(); }
});

test('an empty creation menu does not render a button', async () => {
  const ui = await mount(<WorkspaceActionBar create={{ label: 'Create', actions: [] }} />);
  try { expect(ui.container.querySelector('button')).toBeNull(); }
  finally { await ui.unmount(); }
});

test('disabled single and menu actions expose the disabled attribute', async () => {
  const single = await mount(<WorkspaceActionBar create={{ label: 'New', onClick: vi.fn(), disabled: true }} />);
  try { expect(single.container.querySelector('button')?.hasAttribute('disabled')).toBe(true); }
  finally { await single.unmount(); }

  const menu = await mount(<WorkspaceActionBar create={{ label: 'Create', actions: [
    { label: 'Unavailable', onClick: vi.fn(), disabled: true },
  ] }} />);
  try {
    await act(async () => menu.container.querySelector('button')!.click());
    const action = [...menu.container.querySelectorAll('button')].find(button => button.textContent === 'Unavailable');
    expect(action?.hasAttribute('disabled')).toBe(true);
  } finally { await menu.unmount(); }
});
