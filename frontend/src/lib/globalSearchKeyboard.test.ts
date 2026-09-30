import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  reduceGlobalSearchKeyboard,
  type GlobalSearchKeyboardState,
} from './globalSearchKeyboard.js';

function base(
  partial: Partial<GlobalSearchKeyboardState> = {},
): GlobalSearchKeyboardState {
  return {
    activeIndex: 0,
    activeTabIndex: 0,
    resultCount: 3,
    tabCount: 4,
    focusTarget: 'input',
    ...partial,
  };
}

describe('reduceGlobalSearchKeyboard', () => {
  it('closes on Escape', () => {
    const { effect } = reduceGlobalSearchKeyboard(base(), { type: 'Escape' });
    assert.equal(effect.type, 'close');
  });

  it('moves through results with ArrowDown/Up', () => {
    let state = base({ focusTarget: 'input' });
    ({ state } = reduceGlobalSearchKeyboard(state, { type: 'ArrowDown' }));
    assert.equal(state.focusTarget, 'results');
    assert.equal(state.activeIndex, 0);

    ({ state } = reduceGlobalSearchKeyboard(state, { type: 'ArrowDown' }));
    assert.equal(state.activeIndex, 1);

    ({ state } = reduceGlobalSearchKeyboard(state, { type: 'ArrowUp' }));
    assert.equal(state.activeIndex, 0);
  });

  it('opens the selected result on Enter', () => {
    const { effect } = reduceGlobalSearchKeyboard(
      base({ focusTarget: 'results', activeIndex: 2 }),
      { type: 'Enter' },
    );
    assert.deepEqual(effect, { type: 'open', index: 2 });
  });

  it('cycles tabs when focusTarget is tabs', () => {
    const { state, effect } = reduceGlobalSearchKeyboard(
      base({ focusTarget: 'tabs', activeTabIndex: 1 }),
      { type: 'ArrowRight' },
    );
    assert.equal(state.activeTabIndex, 2);
    assert.deepEqual(effect, { type: 'selectTab', index: 2 });
  });

  it('does not steal left/right when focus is on input', () => {
    const { state, effect } = reduceGlobalSearchKeyboard(
      base({ focusTarget: 'input' }),
      { type: 'ArrowLeft' },
    );
    assert.equal(state.activeTabIndex, 0);
    assert.equal(effect.type, 'none');
  });
});
