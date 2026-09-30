export type GlobalSearchKeyboardTarget = 'input' | 'tabs' | 'results';

export interface GlobalSearchKeyboardState {
  activeIndex: number;
  activeTabIndex: number;
  resultCount: number;
  tabCount: number;
  focusTarget: GlobalSearchKeyboardTarget;
}

export type GlobalSearchKeyboardAction =
  | { type: 'ArrowDown' }
  | { type: 'ArrowUp' }
  | { type: 'ArrowLeft' }
  | { type: 'ArrowRight' }
  | { type: 'Home' }
  | { type: 'End' }
  | { type: 'Escape' }
  | { type: 'Enter' }
  | { type: 'reset'; resultCount: number; tabCount: number };

export type GlobalSearchKeyboardEffect =
  | { type: 'none' }
  | { type: 'close' }
  | { type: 'open'; index: number }
  | { type: 'selectTab'; index: number };

export function reduceGlobalSearchKeyboard(
  state: GlobalSearchKeyboardState,
  action: GlobalSearchKeyboardAction,
): { state: GlobalSearchKeyboardState; effect: GlobalSearchKeyboardEffect } {
  if (action.type === 'reset') {
    return {
      state: {
        ...state,
        activeIndex: 0,
        activeTabIndex: Math.min(state.activeTabIndex, Math.max(0, action.tabCount - 1)),
        resultCount: action.resultCount,
        tabCount: action.tabCount,
      },
      effect: { type: 'none' },
    };
  }

  if (action.type === 'Escape') {
    return { state, effect: { type: 'close' } };
  }

  if (action.type === 'Enter') {
    if (state.focusTarget === 'tabs' && state.tabCount > 0) {
      return {
        state,
        effect: { type: 'selectTab', index: state.activeTabIndex },
      };
    }
    if (state.resultCount > 0) {
      return {
        state,
        effect: {
          type: 'open',
          index: Math.min(state.activeIndex, state.resultCount - 1),
        },
      };
    }
    return { state, effect: { type: 'none' } };
  }

  if (action.type === 'ArrowDown') {
    if (state.resultCount === 0) return { state, effect: { type: 'none' } };
    const next =
      state.focusTarget === 'results'
        ? (state.activeIndex + 1) % state.resultCount
        : 0;
    return {
      state: { ...state, focusTarget: 'results', activeIndex: next },
      effect: { type: 'none' },
    };
  }

  if (action.type === 'ArrowUp') {
    if (state.resultCount === 0) return { state, effect: { type: 'none' } };
    const next =
      state.focusTarget === 'results'
        ? (state.activeIndex - 1 + state.resultCount) % state.resultCount
        : state.resultCount - 1;
    return {
      state: { ...state, focusTarget: 'results', activeIndex: next },
      effect: { type: 'none' },
    };
  }

  if (action.type === 'ArrowLeft' || action.type === 'ArrowRight') {
    if (state.focusTarget !== 'tabs' || state.tabCount === 0) {
      return { state, effect: { type: 'none' } };
    }
    const delta = action.type === 'ArrowRight' ? 1 : -1;
    const next =
      (state.activeTabIndex + delta + state.tabCount) % state.tabCount;
    return {
      state: { ...state, activeTabIndex: next },
      effect: { type: 'selectTab', index: next },
    };
  }

  if (action.type === 'Home') {
    if (state.focusTarget === 'tabs' && state.tabCount > 0) {
      return {
        state: { ...state, activeTabIndex: 0 },
        effect: { type: 'selectTab', index: 0 },
      };
    }
    if (state.resultCount > 0) {
      return {
        state: { ...state, focusTarget: 'results', activeIndex: 0 },
        effect: { type: 'none' },
      };
    }
  }

  if (action.type === 'End') {
    if (state.focusTarget === 'tabs' && state.tabCount > 0) {
      const last = state.tabCount - 1;
      return {
        state: { ...state, activeTabIndex: last },
        effect: { type: 'selectTab', index: last },
      };
    }
    if (state.resultCount > 0) {
      return {
        state: {
          ...state,
          focusTarget: 'results',
          activeIndex: state.resultCount - 1,
        },
        effect: { type: 'none' },
      };
    }
  }

  return { state, effect: { type: 'none' } };
}
