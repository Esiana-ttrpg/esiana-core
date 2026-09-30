export type OverlayMode =
  | { mode: 'search' }
  | { mode: 'command'; query: string };

/**
 * Leading `>` (with optional following whitespace) enters command mode.
 * The remainder after `>` and leading whitespace is the command query.
 */
export function parseOverlayMode(draft: string): OverlayMode {
  if (!draft.startsWith('>')) {
    return { mode: 'search' };
  }
  const query = draft.slice(1).replace(/^\s+/, '');
  return { mode: 'command', query };
}
