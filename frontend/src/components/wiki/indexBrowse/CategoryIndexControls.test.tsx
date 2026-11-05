import { afterEach, expect, test, vi } from 'vitest';
import { act, useState, type ReactNode } from 'react';
import { parseHTML } from 'linkedom';
import { CategoryIndexViewToggle } from './CategoryIndexViewToggle';
import { CategoryIndexRefinePopover } from './CategoryIndexRefinePopover';

vi.mock('@/lib/categoryIndexBrowse', () => ({
  deriveFacetOptions: () => [],
  hasActiveCategoryIndexRefine: () => false,
  resetCategoryIndexRefine: () => ({}),
}));

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

test('view selector offers only registered presentations and hides a single choice', async () => {
  const onChange = vi.fn();
  const ui = await mount(<CategoryIndexViewToggle viewMode="hierarchy" onViewModeChange={onChange}
    allowedViews={['table', 'hierarchy']} hierarchyLabel="Explorer" />);
  try {
    expect([...ui.container.querySelectorAll('button')].map(button => button.getAttribute('aria-label')))
      .toEqual(['Table view', 'Explorer view']);
    await act(async () => ui.container.querySelector('button')!.click());
    expect(onChange).toHaveBeenCalledWith('table');
  } finally { await ui.unmount(); }
  const single = await mount(<CategoryIndexViewToggle viewMode="table" onViewModeChange={onChange} allowedViews={['table']} />);
  try { expect(single.container.querySelector('button')).toBeNull(); }
  finally { await single.unmount(); }
});

test('Refine resets grouping and sort choices along with filters', async () => {
  const reset = vi.fn();
  function Harness() {
    const [group, setGroup] = useState('region');
    const [sort, setSort] = useState('date');
    const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
    return <><CategoryIndexRefinePopover facetDefs={[]} refineState={{}} children={[]} categoryTitle="Locations"
      onRefineChange={() => {}} onResetRefine={reset}
      grouping={{ value: group, defaultValue: 'none', options: [{value: 'none', label: 'None'}, {value: 'region', label: 'Region'}], onChange: setGroup }}
      sorting={{ value: sort, defaultValue: 'name', options: [{value: 'name', label: 'Name'}, {value: 'date', label: 'Date'}], onChange: setSort,
        direction, defaultDirection: 'asc', onDirectionChange: setDirection }} />
      <output>{`${group}/${sort}/${direction}`}</output></>;
  }
  const ui = await mount(<Harness />);
  try {
    await act(async () => ui.container.querySelector('button')!.click());
    const resetButton = [...ui.container.querySelectorAll('button')].find(button => button.textContent === 'Reset all');
    expect(resetButton).toBeTruthy();
    await act(async () => resetButton!.click());
    expect(reset).toHaveBeenCalledOnce();
    expect(ui.container.querySelector('output')?.textContent).toBe('none/name/asc');
  } finally { await ui.unmount(); }
});

test('reset filters leaves grouping and sort untouched', async () => {
  const reset = vi.fn();
  const groupChange = vi.fn();
  const sortChange = vi.fn();
  const directionChange = vi.fn();
  const ui = await mount(<CategoryIndexRefinePopover facetDefs={[]} refineState={{}} children={[]}
    categoryTitle="Locations" onRefineChange={() => {}} activeCount={1} onResetRefine={reset}
    grouping={{ value: 'region', defaultValue: 'none', options: [], onChange: groupChange }}
    sorting={{ value: 'updated', defaultValue: 'name', options: [], onChange: sortChange,
      direction: 'desc', defaultDirection: 'asc', onDirectionChange: directionChange }} />);
  try {
    await act(async () => ui.container.querySelector('button')!.click());
    const button = [...ui.container.querySelectorAll('button')].find(node => node.textContent === 'Reset filters');
    expect(button).toBeTruthy();
    await act(async () => button!.click());
    expect(reset).toHaveBeenCalledOnce();
    expect(groupChange).not.toHaveBeenCalled();
    expect(sortChange).not.toHaveBeenCalled();
    expect(directionChange).not.toHaveBeenCalled();
  } finally { await ui.unmount(); }
});
