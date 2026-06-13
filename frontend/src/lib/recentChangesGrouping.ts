import type { CampaignActivityRow } from '@/lib/campaignActivityApi';

export interface ActivityDateBucket {
  key: string;
  label: string;
  items: CampaignActivityRow[];
  newestAt: number;
  defaultExpanded: boolean;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function monthLabelFromKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month - 1, 1));
  } catch {
    return monthKey;
  }
}

/** Groups activity rows into Today / Yesterday / Month-Year buckets (newest sections first). */
export function groupActivityByDate(rows: CampaignActivityRow[]): ActivityDateBucket[] {
  const now = Date.now();
  const todayStart = startOfLocalDay(new Date());
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const rollingCutoff = now - THIRTY_DAYS_MS;

  const today: CampaignActivityRow[] = [];
  const yesterday: CampaignActivityRow[] = [];
  const byMonth = new Map<string, CampaignActivityRow[]>();

  for (const row of rows) {
    const created = new Date(row.createdAt);
    const dayStart = startOfLocalDay(created);

    if (dayStart === todayStart) {
      today.push(row);
      continue;
    }
    if (dayStart === yesterdayStart) {
      yesterday.push(row);
      continue;
    }

    const monthKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
    const list = byMonth.get(monthKey) ?? [];
    list.push(row);
    byMonth.set(monthKey, list);
  }

  const buckets: ActivityDateBucket[] = [];

  const pushBucket = (key: string, label: string, items: CampaignActivityRow[]) => {
    if (items.length === 0) return;
    const newestAt = Math.max(...items.map((r) => new Date(r.createdAt).getTime()));
    buckets.push({
      key,
      label,
      items,
      newestAt,
      defaultExpanded: newestAt >= rollingCutoff,
    });
  };

  pushBucket('today', 'Today', today);
  pushBucket('yesterday', 'Yesterday', yesterday);

  const monthKeys = [...byMonth.keys()].sort((a, b) => b.localeCompare(a));
  for (const monthKey of monthKeys) {
    const items = byMonth.get(monthKey) ?? [];
    pushBucket(`month:${monthKey}`, monthLabelFromKey(monthKey), items);
  }

  return buckets;
}

export function formatByteSize(bytes: number | null | undefined): string | null {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return null;
  const n = Math.max(0, Math.floor(bytes));
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  return kb >= 100 ? `${Math.round(kb)} KB` : `${kb.toFixed(1)} KB`;
}

export function formatDeltaBytes(delta: number | null | undefined): string | null {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) return null;
  if (delta === 0) return '0';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toLocaleString()}`;
}

export function deltaBadgeClasses(delta: number | null | undefined): string {
  if (delta === null || delta === undefined || !Number.isFinite(delta) || delta === 0) {
    return 'border-border bg-elevated/80 text-muted';
  }
  if (delta > 0) {
    return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300';
  }
  return 'border-red-500/40 bg-red-500/15 text-red-300';
}
