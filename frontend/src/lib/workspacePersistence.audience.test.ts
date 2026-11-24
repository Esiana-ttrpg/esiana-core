import { afterEach, expect, test } from 'vitest';
import { clearLegacyAdventurePerspectives, readAdventurePerspective } from './workspacePersistence';

const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
afterEach(() => { if (previous) Object.defineProperty(globalThis, 'window', previous); else Reflect.deleteProperty(globalThis, 'window'); });

test('legacy Public selection is deleted without changing other preferences', () => {
  const values = new Map<string, string>();
  const key = 'esiana:workspace:campaign';
  values.set(key, JSON.stringify({ adventurePerspective: 'public', threadsLens: 'activity' }));
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (name: string) => values.get(name) ?? null,
    setItem: (name: string, value: string) => values.set(name, value),
  } } });
  expect(readAdventurePerspective('campaign')).toBeNull();
  expect(JSON.parse(values.get(key)!)).toEqual({ threadsLens: 'activity' });
  expect(readAdventurePerspective('campaign')).toBeNull();
  values.set(key, 'null');
  expect(readAdventurePerspective('campaign')).toBeNull();
});

test('cleanup removes invalid perspectives across campaigns while preserving valid state', () => {
  const values = new Map([
    ['esiana:workspace:one', JSON.stringify({ adventurePerspective: 'public', threadsLens: 'activity' })],
    ['esiana:workspace:two', JSON.stringify({ adventurePerspective: 'party' })],
    ['unrelated', JSON.stringify({ adventurePerspective: 'public' })],
  ]);
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    get length() { return values.size; }, key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (name: string) => values.get(name) ?? null,
    setItem: (name: string, value: string) => values.set(name, value),
  } } });
  clearLegacyAdventurePerspectives();
  expect(JSON.parse(values.get('esiana:workspace:one')!)).toEqual({ threadsLens: 'activity' });
  expect(JSON.parse(values.get('esiana:workspace:two')!)).toEqual({ adventurePerspective: 'party' });
  expect(JSON.parse(values.get('unrelated')!)).toEqual({ adventurePerspective: 'public' });
});
