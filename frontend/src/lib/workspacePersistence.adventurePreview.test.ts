import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  patchAdventurePerspective,
  readAdventurePerspective,
} from './workspacePersistence';

const store = new Map<string, string>();

describe('adventure perspective persistence', () => {
  const previousWindow = (globalThis as { window?: unknown }).window;

  afterEach(() => {
    store.clear();
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, 'window');
    } else {
      (globalThis as { window?: unknown }).window = previousWindow;
    }
  });

  it('persists Party and discards a legacy Public perspective', () => {
    (globalThis as { window: unknown }).window = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
    };

    assert.equal(readAdventurePerspective('matrix-review'), null);
    store.set('esiana:workspace:matrix-review', JSON.stringify({ adventurePerspective: 'public', threadsLens: 'activity' }));
    assert.equal(readAdventurePerspective('matrix-review'), null);
    assert.deepEqual(JSON.parse(store.get('esiana:workspace:matrix-review')!), { threadsLens: 'activity' });
    patchAdventurePerspective('matrix-review', 'party');
    assert.equal(readAdventurePerspective('matrix-review'), 'party');
    store.set('esiana:workspace:matrix-review', JSON.stringify({ adventurePerspective: 'public' }));
    assert.equal(readAdventurePerspective('matrix-review'), null);
    assert.equal('adventurePerspective' in JSON.parse(store.get('esiana:workspace:matrix-review')!), false);
  });
});
