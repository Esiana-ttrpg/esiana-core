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

  it('round-trips Public without coercing it to Player', () => {
    (globalThis as { window: unknown }).window = {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
      },
    };

    assert.equal(readAdventurePerspective('matrix-review'), 'dm');
    patchAdventurePerspective('matrix-review', 'public');
    assert.equal(readAdventurePerspective('matrix-review'), 'public');
    patchAdventurePerspective('matrix-review', 'party');
    assert.equal(readAdventurePerspective('matrix-review'), 'party');
    patchAdventurePerspective('matrix-review', 'public');
    assert.equal(readAdventurePerspective('matrix-review'), 'public');
  });
});
