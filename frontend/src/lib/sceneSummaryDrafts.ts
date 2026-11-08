type PendingSave = { timer: ReturnType<typeof setTimeout>; save: () => Promise<void>; promise: Promise<void> | null };
const pending = new Map<string, PendingSave>();
const inFlight = new Map<string, Promise<void>>();

async function flushKey(key: string): Promise<void> {
  const entry = pending.get(key);
  if (!entry) return;
  if (entry.promise) return entry.promise;
  clearTimeout(entry.timer);
  entry.promise = (inFlight.get(key) ?? Promise.resolve()).catch(() => {}).then(entry.save);
  const running = entry.promise;
  inFlight.set(key, running);
  try {
    await entry.promise;
    if (pending.get(key) === entry) pending.delete(key);
  } catch (error) {
    entry.promise = null;
    throw error;
  } finally {
    if (inFlight.get(key) === running) inFlight.delete(key);
  }
}

export function queueSceneSummaryDraft(key: string, save: () => Promise<void>): void {
  const previous = pending.get(key);
  if (previous) clearTimeout(previous.timer);
  const entry: PendingSave = { timer: setTimeout(() => { void flushKey(key).catch(() => {}); }, 500), save, promise: null };
  pending.set(key, entry);
}

export async function flushSceneSummaryDrafts(): Promise<void> {
  await Promise.all([...pending.keys()].map(flushKey));
}

export async function flushSceneSummaryDraft(key: string): Promise<void> {
  await flushKey(key);
}
