/**
 * Touch + keyboard interaction helpers for wikiLink inline nodes (v0.9).
 *
 * Touch:
 * - Single tap (read): select/highlight; show preview; do not navigate
 * - Second tap (read, selected): navigate to target
 * - Long press: open action sheet (open / resolve stub / remove in edit)
 * - Mobile backspace: first press selects atom; second deletes (see wikiLinkKeyboard)
 *
 * Keyboard: see wikiLinkKeyboard.ts
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export const WIKI_LINK_LONG_PRESS_MS = 500;
