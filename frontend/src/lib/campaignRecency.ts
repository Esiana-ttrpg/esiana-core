import type { CampaignSummary } from '@/types/campaign';

const STORAGE_KEY = 'esiana:campaignRecency';

type RecencyMap = Record<string, string>;

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

/** Seeds recency map (tests only). */
export function seedCampaignRecencyForTests(map: RecencyMap): void {
  writeRecencyMap(map);
}

/** Test helper — clears both in-memory and browser storage for the recency key. */
export function clearCampaignRecencyForTests(): void {
  memoryStore.clear();
  try {
    getStorage().removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function readRecencyMap(): RecencyMap {
  try {
    const raw = getStorage().getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const map: RecencyMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key === 'string' && typeof value === 'string' && value.trim()) {
        map[key] = value;
      }
    }
    return map;
  } catch {
    return {};
  }
}

function writeRecencyMap(map: RecencyMap): void {
  getStorage().setItem(STORAGE_KEY, JSON.stringify(map));
}

export function recordCampaignOpened(campaignId: string): void {
  const id = campaignId.trim();
  if (!id) return;
  const map = readRecencyMap();
  map[id] = new Date().toISOString();
  writeRecencyMap(map);
}

export function getCampaignLastOpenedAt(campaignId: string): string | null {
  return readRecencyMap()[campaignId] ?? null;
}

/** Member campaigns only, strict recency order, up to `limit`. */
export function getRecentMemberCampaigns(
  campaigns: readonly CampaignSummary[],
  limit = 3,
): CampaignSummary[] {
  const membersById = new Map(
    campaigns.filter((c) => c.isMember).map((c) => [c.id, c] as const),
  );
  const map = readRecencyMap();

  return Object.entries(map)
    .filter(([id]) => membersById.has(id))
    .sort(([, a], [, b]) => Date.parse(b) - Date.parse(a))
    .slice(0, limit)
    .map(([id]) => membersById.get(id)!)
    .filter(Boolean);
}
