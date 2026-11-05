import { afterEach, beforeEach, expect, test } from 'vitest';
import { readWorkspaceBrowseState, resolveWorkspaceBrowseUrl, writeWorkspaceBrowseState, writeWorkspaceBrowseUrl,
  type WorkspaceBrowseConfig, type WorkspaceBrowseState } from './categoryIndexBrowseStorage';

const defaults: WorkspaceBrowseState = { searchQuery: '', refineState: {}, group: 'none', sort: 'name', direction: 'asc', viewMode: 'table' };
const config: WorkspaceBrowseConfig = { defaults, groups: ['none', 'region'], sorts: ['name', 'updated'], views: ['table', 'card', 'hierarchy'], facetIds: ['Type'] };
const scope = { userId: 'mira', campaignHandle: 'campaign', workspaceId: 'locations' };
const values = new Map<string, string>();
const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
beforeEach(() => Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, value),
} }));
afterEach(() => {
  values.clear();
  if (original) Object.defineProperty(globalThis, 'localStorage', original);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});

const saved: WorkspaceBrowseState = { ...defaults, searchQuery: 'tower', refineState: { Type: { Tower: false } }, group: 'region', sort: 'updated', direction: 'desc', viewMode: 'card' };
test('preferences are isolated by account, campaign and workspace', () => {
  writeWorkspaceBrowseState(scope, saved);
  expect(readWorkspaceBrowseState(scope, config)).toEqual(saved);
  expect(readWorkspaceBrowseState({ ...scope, userId: 'sable' }, config)).toEqual(defaults);
  expect(readWorkspaceBrowseState({ ...scope, campaignHandle: 'other' }, config)).toEqual(defaults);
  expect(readWorkspaceBrowseState({ ...scope, workspaceId: 'objects' }, config)).toEqual(defaults);
});
test('view is stored independently and invalid values use declared defaults', () => {
  writeWorkspaceBrowseState(scope, saved);
  const keys = [...values.keys()];
  const browseKey = keys.find(key => key.includes('.browse.'))!;
  const viewKey = keys.find(key => key.includes('.view.'))!;
  values.set(browseKey, JSON.stringify({ group: 'bad', sort: 'bad', direction: 'bad', refineState: { Type: { Tower: false, Castle: 'bad' }, Unknown: { x: false } } }));
  expect(readWorkspaceBrowseState(scope, config)).toEqual({ ...defaults, refineState: { Type: { Tower: false } }, viewMode: 'card' });
  values.set(viewKey, '"bad"');
  expect(readWorkspaceBrowseState(scope, config).viewMode).toBe('table');
});
test('explicit URL fields override saved fields; history snapshots resolve independently', () => {
  const first = writeWorkspaceBrowseUrl(new URLSearchParams('unrelated=keep'), saved);
  const second = writeWorkspaceBrowseUrl(first, { ...saved, group: 'none', viewMode: 'hierarchy' });
  expect(resolveWorkspaceBrowseUrl(defaults, first, config)).toEqual(saved);
  expect(resolveWorkspaceBrowseUrl(defaults, second, config).viewMode).toBe('hierarchy');
  expect(first.get('unrelated')).toBe('keep');
  expect(resolveWorkspaceBrowseUrl(saved, new URLSearchParams('view=invalid&direction=wrong&filters=broken'), config))
    .toEqual({ ...saved, viewMode: 'table', direction: 'asc', refineState: {} });
  expect(resolveWorkspaceBrowseUrl(saved, new URLSearchParams('group=none'), config)).toEqual({ ...saved, group: 'none' });
});

