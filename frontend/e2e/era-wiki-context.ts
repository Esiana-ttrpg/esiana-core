export function useWiki() {
  const role = document.cookie.match(/eraRole=([^;]+)/)?.[1] ?? 'GAMEMASTER';
  return { can: () => role === 'GAMEMASTER', campaignHandle: '', flatPages: [], pinnedShortcuts: [] };
}
export function useOptionalWiki() { return undefined; }
