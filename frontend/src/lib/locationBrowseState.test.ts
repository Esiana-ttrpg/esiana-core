import { expect, test } from 'vitest';
import { groupLocationBrowseChildren, sortLocationBrowseChildren } from './locationBrowseState';
import type { CategoryIndexChild } from './wiki';

const first = { id: 'a', title: 'Spire', parentId: 'root', updatedAt: '2025-01-01', visibility: 'PARTY', snippet: '' } as CategoryIndexChild;
const second = { id: 'b', title: 'Observatory', parentId: 'a', updatedAt: '2026-01-01', visibility: 'PARTY', snippet: '' } as CategoryIndexChild;

test('flat location sorting and grouping preserve records and hierarchy', () => {
  const input = [first, second];
  const ordered = sortLocationBrowseChildren(input, 'updated', 'desc');
  expect(ordered.map(item => item.id)).toEqual(['b', 'a']);
  expect(input.map(item => item.id)).toEqual(['a', 'b']);
  const grouped = groupLocationBrowseChildren(ordered, child => child.id === 'b' ? 'North' : null);
  expect(grouped.map(([name, children]) => [name, children.map(child => child.id)])).toEqual([
    ['No region', ['a']], ['North', ['b']],
  ]);
  expect(second.parentId).toBe('a');
  expect(sortLocationBrowseChildren(input, 'name', 'asc').map(item => item.id)).toEqual(['b', 'a']);
});
