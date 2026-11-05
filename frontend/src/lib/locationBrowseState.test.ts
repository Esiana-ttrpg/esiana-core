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
  const grouped = groupLocationBrowseChildren(ordered, child => ({ regionPageId: null,
    region: child.id === 'b' ? 'North' : null, label: child.id === 'b' ? 'North' : null }));
  expect(grouped.map(({ label, children }) => [label, children.map(child => child.id)])).toEqual([
    ['No region', ['a']], ['North', ['b']],
  ]);
  expect(second.parentId).toBe('a');
  expect(sortLocationBrowseChildren(input, 'name', 'asc').map(item => item.id)).toEqual(['b', 'a']);
  expect(sortLocationBrowseChildren(input, 'updated', 'asc').map(item => item.id)).toEqual(['a', 'b']);
  expect(sortLocationBrowseChildren(input, 'name', 'desc').map(item => item.id)).toEqual(['a', 'b']);
});

test('region grouping preserves identity when labels collide', () => {
  const rows = [first, second, { ...first, id: 'c' }, { ...first, id: 'd' }, { ...first, id: 'e' }, { ...first, id: 'f' }];
  const groups = groupLocationBrowseChildren(rows, child => {
    if (child.id === 'a') return { regionPageId: 'one', region: null, label: 'North' };
    if (child.id === 'b') return { regionPageId: 'two', region: null, label: 'North' };
    if (child.id === 'c') return { regionPageId: null, region: 'No region', label: 'No region' };
    if (child.id === 'd') return { regionPageId: null, region: null, label: null };
    return { regionPageId: null, region: child.id === 'e' ? ' north ' : 'NORTH', label: 'north' };
  });
  expect(groups).toHaveLength(5);
  expect(new Set(groups.map(group => group.key)).size).toBe(5);
  expect(groups.filter(group => group.label === 'No region')).toHaveLength(2);
  expect(groups.find(group => group.label === 'north')?.children.map(child => child.id)).toEqual(['e', 'f']);
});

test('a reloaded region change moves a location to the new group', () => {
  const region = (child: CategoryIndexChild) => ({ regionPageId: null,
    region: (child.metadata as { region: string }).region, label: (child.metadata as { region: string }).region });
  const before = [{ ...first, metadata: { region: 'North' } }, { ...second, metadata: { region: 'South' } }] as CategoryIndexChild[];
  const after = [{ ...before[0], metadata: { region: 'South' } }, before[1]] as CategoryIndexChild[];
  expect(groupLocationBrowseChildren(before, region)).toHaveLength(2);
  expect(groupLocationBrowseChildren(after, region).map(group => [group.label, group.children.map(child => child.id)]))
    .toEqual([['South', ['a', 'b']]]);
});
