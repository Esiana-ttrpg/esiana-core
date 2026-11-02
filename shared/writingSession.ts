/** 15 minutes groups sessions; it does not count as active writing time. */
export const WRITING_SESSION_IDLE_MS = 15 * 60 * 1000;
/** Minimum client/server spacing for activity heartbeats. */
export const WRITING_SESSION_HEARTBEAT_MIN_MS = 30 * 1000;
/** Consecutive activity pings within this window extend one focused interval. */
export const WRITING_SESSION_ACTIVITY_MERGE_MS = 90 * 1000;

export type WritingSessionInterval = {
  clientInstanceKey: string;
  startedAt: string;
  endedAt: string;
  open: boolean;
};

export function parseWritingSessionIntervals(raw: unknown): WritingSessionInterval[] {
  if (!Array.isArray(raw)) return [];
  const rows: WritingSessionInterval[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.clientInstanceKey !== 'string' || !row.clientInstanceKey.trim()) continue;
    if (typeof row.startedAt !== 'string' || typeof row.endedAt !== 'string') continue;
    const startedAt = Date.parse(row.startedAt);
    const endedAt = Date.parse(row.endedAt);
    if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) continue;
    rows.push({
      clientInstanceKey: row.clientInstanceKey.trim(),
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date(Math.max(startedAt, endedAt)).toISOString(),
      open: row.open === true,
    });
  }
  return rows;
}

function iso(at: Date): string {
  return at.toISOString();
}

/** Record a focused, visible, connected activity ping. Idle gaps start a new interval. */
export function applyActivityInterval(
  intervals: WritingSessionInterval[],
  input: { clientInstanceKey: string; at: Date; mergeWindowMs?: number },
): WritingSessionInterval[] {
  const mergeWindowMs = input.mergeWindowMs ?? WRITING_SESSION_ACTIVITY_MERGE_MS;
  const key = input.clientInstanceKey.trim();
  if (!key) return intervals;
  const atMs = input.at.getTime();
  const next = intervals.map((row) => ({ ...row }));
  const openIndex = next.findIndex((row) => row.clientInstanceKey === key && row.open);
  if (openIndex >= 0) {
    const open = next[openIndex];
    const endedMs = Date.parse(open.endedAt);
    if (atMs - endedMs <= mergeWindowMs) {
      open.endedAt = iso(input.at);
      return next;
    }
    open.open = false;
  }
  next.push({
    clientInstanceKey: key,
    startedAt: iso(input.at),
    endedAt: iso(input.at),
    open: true,
  });
  return next;
}

/** Blur, hide, or disconnect: stop extending this tab's interval without adding idle tail. */
export function closeInstanceIntervals(
  intervals: WritingSessionInterval[],
  clientInstanceKey: string,
): WritingSessionInterval[] {
  const key = clientInstanceKey.trim();
  return intervals.map((row) =>
    row.clientInstanceKey === key && row.open ? { ...row, open: false } : row,
  );
}

/** Union duration across tabs so overlapping focus does not double-count. */
export function unionIntervalDurationMs(intervals: WritingSessionInterval[]): number {
  const ranges = intervals
    .map((row) => {
      const start = Date.parse(row.startedAt);
      const end = Date.parse(row.endedAt);
      return { start, end: Math.max(start, end) };
    })
    .filter((row) => Number.isFinite(row.start) && Number.isFinite(row.end) && row.end > row.start)
    .sort((a, b) => a.start - b.start);
  if (ranges.length === 0) return 0;

  let total = 0;
  let cursorStart = ranges[0].start;
  let cursorEnd = ranges[0].end;
  for (let i = 1; i < ranges.length; i += 1) {
    const range = ranges[i];
    if (range.start <= cursorEnd) {
      cursorEnd = Math.max(cursorEnd, range.end);
      continue;
    }
    total += cursorEnd - cursorStart;
    cursorStart = range.start;
    cursorEnd = range.end;
  }
  total += cursorEnd - cursorStart;
  return total;
}

export function uniqueDocumentIds(existing: unknown, documentId?: string | null): string[] {
  const ids = Array.isArray(existing)
    ? existing.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : [];
  if (documentId && documentId.trim() && !ids.includes(documentId.trim())) {
    ids.push(documentId.trim());
  }
  return ids;
}

export function isWritingSessionExpired(lastActivityAt: Date, now: Date, idleMs = WRITING_SESSION_IDLE_MS): boolean {
  return now.getTime() - lastActivityAt.getTime() >= idleMs;
}

export function shouldSendActivityHeartbeat(lastSentAt: number | null, now: number): boolean {
  if (lastSentAt == null) return true;
  return now - lastSentAt >= WRITING_SESSION_HEARTBEAT_MIN_MS;
}

export function canCountActivityHeartbeat(input: {
  focused: boolean;
  visible: boolean;
  online: boolean;
}): boolean {
  return input.focused && input.visible && input.online;
}
