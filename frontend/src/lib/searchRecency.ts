const STORAGE_KEY = 'esiana:searchRecency';
const MAX_RECENT = 8;

type RecencyStore = Record<string, string[]>;

const memoryStore = new Map<string, string>();

function getStorage(): Storage {
  if (typeof globalThis.localStorage !== 'undefined') {
    return globalThis.localStorage;
  }
  return {
    getItem: (key) => memoryStore.get(key) ?? null,
    setItem: (key, value) => {
      memoryStore.set(key, value);
    },
    removeItem: (key) => {
      memoryStore.delete(key);
    },
    clear: () => memoryStore.clear(),
    key: (index) => [...memoryStore.keys()][index] ?? null,
    get length() {
      return memoryStore.size;
    },
  } as Storage;
}

function readStore(): RecencyStore {
  try {
    const raw = getStorage().getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const store: RecencyStore = {};
    for (const [campaignId, value] of Object.entries(parsed)) {
      if (!Array.isArray(value)) continue;
      store[campaignId] = value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .slice(0, MAX_RECENT);
    }
    return store;
  } catch {
    return {};
  }
}

function writeStore(store: RecencyStore): void {
  try {
    getStorage().setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage unavailable or full; recency is best-effort
  }
}

export function listRecentSearches(campaignId: string): string[] {
  const id = campaignId.trim();
  if (!id) return [];
  return [...(readStore()[id] ?? [])];
}

export function recordRecentSearch(campaignId: string, query: string): void {
  const id = campaignId.trim();
  const q = query.trim();
  if (!id || q.length < 2) return;
  const store = readStore();
  const existing = store[id] ?? [];
  const next = [q, ...existing.filter((entry) => entry.toLowerCase() !== q.toLowerCase())].slice(
    0,
    MAX_RECENT,
  );
  store[id] = next;
  writeStore(store);
}

export function removeRecentSearch(campaignId: string, query: string): void {
  const id = campaignId.trim();
  const q = query.trim().toLowerCase();
  if (!id || !q) return;
  const store = readStore();
  const existing = store[id] ?? [];
  store[id] = existing.filter((entry) => entry.toLowerCase() !== q);
  writeStore(store);
}

export function clearRecentSearches(campaignId: string): void {
  const id = campaignId.trim();
  if (!id) return;
  const store = readStore();
  delete store[id];
  writeStore(store);
}

/** Test helper. */
export function clearSearchRecencyForTests(): void {
  memoryStore.clear();
  try {
    getStorage().removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
