import { afterEach, expect, test, vi } from 'vitest';
import { act, type ReactNode } from 'react';
import { parseHTML } from 'linkedom';
import { TimelineSettingsTab } from './TimelineSettingsTab';

const mocks = vi.hoisted(() => ({ list: vi.fn(), update: vi.fn(), create: vi.fn(), remove: vi.fn() }));
vi.mock('@/lib/chronologyCategoriesApi', () => ({ listChronologyCategories: mocks.list, updateChronologyCategory: mocks.update, createChronologyCategory: mocks.create, deleteChronologyCategory: mocks.remove }));
vi.mock('@/lib/chronologySettingsApi', () => ({
  fetchChronologySettings: async () => ({ manualEventImportance: 'MINOR', downtimeEventImportance: 'NOTICE', progressionEventImportance: 'NOTICE' }),
  updateChronologySettings: vi.fn(),
}));
const restore: (() => void)[] = [];
afterEach(() => { for (const cleanup of restore.splice(0).reverse()) cleanup(); vi.resetAllMocks(); });

async function mount(children: ReactNode) {
  const { window } = parseHTML('<html><body><div id="root"></div></body></html>');
  window.document.oninput = null;
  for (const [key, value] of Object.entries({ window, document: window.document, HTMLElement: window.HTMLElement, Event: window.Event, IS_REACT_ACT_ENVIRONMENT: true })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    restore.push(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  const container = window.document.getElementById('root')!;
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(container);
  await act(async () => root.render(children));
  return { container, unmount: () => act(async () => root.unmount()) };
}
const first = { id: 'discovery', campaignId: 'campaign', name: 'Discovery', color: '#123456', icon: 'compass', sortOrder: 0 };
const second = { ...first, id: 'personal', name: 'Personal', icon: 'heart', sortOrder: 1 };

test('pending icon edits block reorder and their successful result survives the next reorder', async () => {
  mocks.list.mockResolvedValue([first, second]);
  let finish!: (value: unknown) => void;
  mocks.update.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const ui = await mount(<TimelineSettingsTab campaignHandle="campaign" />);
  try {
    const select = ui.container.querySelector('select[aria-label="Icon for Discovery"]')!;
    const move = ui.container.querySelector('button[aria-label="Move Discovery down"]')!;
    await act(async () => {
      (select.querySelector('option[value="cake"]') as HTMLOptionElement).selected = true;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      // Same tick: the ref must block this before disabled controls render.
      move.dispatchEvent(new Event('click', { bubbles: true }));
    });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenLastCalledWith('campaign', 'discovery', { icon: 'cake' });
    expect(ui.container.querySelector('fieldset[disabled]')).not.toBeNull();
    await act(async () => { finish({ ...first, icon: 'cake' }); });
    mocks.update.mockResolvedValueOnce({ ...first, icon: 'cake', sortOrder: 1 });
    await act(async () => { move.dispatchEvent(new Event('click', { bubbles: true })); });
    expect(mocks.update).toHaveBeenLastCalledWith('campaign', 'discovery', { orderedCategoryIds: ['personal', 'discovery'] });
    expect(ui.container.querySelector('select[aria-label="Icon for Discovery"]')?.querySelector('option[selected]')?.getAttribute('value')).toBe('cake');
  } finally { await ui.unmount(); }
});

test('blur-triggered name edits block a reorder click before React commits disabled controls', async () => {
  mocks.list.mockResolvedValue([first, second]);
  let finish!: (value: unknown) => void;
  mocks.update.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const ui = await mount(<TimelineSettingsTab campaignHandle="campaign" />);
  try {
    const input = ui.container.querySelector('input[value="Discovery"]') as HTMLInputElement;
    input.setAttribute('type', 'text'); // LinkeDOM does not supply the browser's implicit type.
    await act(async () => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')!.set!.call(input, 'Archives');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      input.dispatchEvent(new Event('focusout', { bubbles: true }));
      ui.container.querySelector('button[aria-label="Move Discovery down"]')!.dispatchEvent(new Event('click', { bubbles: true }));
    });
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith('campaign', 'discovery', { name: 'Archives' });
    await act(async () => { finish({ ...first, name: 'Archives' }); });
    expect(ui.container.textContent).toContain('Archives');
  } finally { await ui.unmount(); }
});

test('new categories submit the selected supported icon', async () => {
  mocks.list.mockResolvedValue([]);
  mocks.create.mockResolvedValue(first);
  const ui = await mount(<TimelineSettingsTab campaignHandle="campaign" />);
  try {
    const input = ui.container.querySelector('input[placeholder="Category name"]') as HTMLInputElement;
    input.setAttribute('type', 'text');
    const select = ui.container.querySelector('select[aria-label="New category icon"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')!.set!.call(input, 'Discovery');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      (select.querySelector('option[value="compass"]') as HTMLOptionElement).selected = true;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => { input.closest('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(mocks.create).toHaveBeenCalledWith('campaign', { name: 'Discovery', color: '#8b9bb4', icon: 'compass' });
  } finally { await ui.unmount(); }
});
