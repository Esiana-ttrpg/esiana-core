import { expect, test } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseHTML } from 'linkedom';
import { WorkspaceHeader } from './WorkspaceHeader';
import { CategoryIndexToolbar } from '@/components/wiki/indexBrowse/CategoryIndexToolbar';

test('compact collection header keeps a small semantic title and Create last', () => {
  const html = renderToStaticMarkup(<WorkspaceHeader compact title="Locations" actions={
    <CategoryIndexToolbar createLabel="Create location" onCreate={() => {}}
      refineControl={<button>Refine</button>} viewMode="table" onViewModeChange={() => {}}
      allowedViews={['card', 'table', 'hierarchy']} hierarchyLabel="Explorer" />
  } />);
  const { document } = parseHTML(html);
  const heading = document.querySelector('h1')!;
  expect(heading.textContent).toBe('Locations');
  expect(heading.className).toContain('text-sm');
  expect(heading.className).not.toContain('type-display');
  expect(document.querySelector('header')?.className).toContain('workspace-header--compact');
  const buttons = [...document.querySelectorAll('button')];
  expect(buttons.map(button => button.getAttribute('aria-label')).filter(Boolean))
    .toEqual(['Cards view', 'Table view', 'Explorer view']);
  expect(buttons.at(-1)?.textContent).toBe('Create location');
  expect(html).not.toContain('Party');
});
