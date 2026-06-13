import type { SeedOp, SeedPlan } from './seedPlan.js';

const DEFAULT_RETRY = { maxAttempts: 3, backoffMs: [250, 1000, 3000] };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveLinkIds(markdown: string, idMap: Map<string, string>): string {
  return markdown.replace(/\{\{([^}]+)\}\}/g, (_m, key: string) => {
    const pageId = idMap.get(key.trim());
    return pageId ?? '';
  });
}

function resolveBlocks(blocks: unknown, idMap: Map<string, string>): unknown {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map((block) => {
    const record = block as { content?: { markdown?: string } };
    if (!record?.content?.markdown) return block;
    return {
      ...block,
      content: {
        ...record.content,
        markdown: resolveLinkIds(record.content.markdown, idMap),
      },
    };
  });
}

async function apiFetch(
  baseUrl: string,
  path: string,
  options: RequestInit,
): Promise<Record<string, unknown>> {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let body: Record<string, unknown> | string | null;
  try {
    body = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const err = new Error(
      typeof body === 'object' && body && typeof body.error === 'string'
        ? body.error
        : `HTTP ${res.status}`,
    ) as Error & { status?: number; body?: unknown };
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return (body ?? {}) as Record<string, unknown>;
}

interface RunOpContext {
  baseUrl: string;
  campaignSlug: string;
  bearerToken: string;
  idMap: Map<string, string>;
  calendarId: string | null;
}

async function runOp(op: SeedOp, ctx: RunOpContext): Promise<void> {
  const { baseUrl, campaignSlug, bearerToken, idMap, calendarId } = ctx;
  const headers = {
    Authorization: `Bearer ${bearerToken}`,
    'Content-Type': 'application/json',
  };
  const temporal = {
    provenance: 'seed',
    preserveTemporalHistory: true,
    metadata: op.temporal,
  };

  if (op.kind === 'createPage') {
    const parentId = op.parentKey ? (idMap.get(op.parentKey) ?? null) : null;
    const blocks = resolveBlocks(op.blocks, idMap);
    const result = await apiFetch(baseUrl, `/api/campaigns/${campaignSlug}/wiki`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: op.title,
        parentId,
        metadata: op.metadata,
        blocks,
        templateType: op.templateType ?? 'DEFAULT',
        ...(op.tags?.length ? { tags: op.tags } : {}),
        ...(op.visibility ? { visibility: op.visibility } : {}),
        temporal,
      }),
    });
    const page = result.page as { id?: string } | undefined;
    const pageId = page?.id;
    if (!pageId) throw new Error(`createPage missing id for ${op.clientKey}`);
    idMap.set(op.clientKey, pageId);
    return;
  }

  if (op.kind === 'patchLayout') {
    const pageId = idMap.get(op.pageKey);
    if (!pageId) throw new Error(`Unknown pageKey ${op.pageKey}`);
    await apiFetch(baseUrl, `/api/campaigns/${campaignSlug}/wiki/${pageId}/layout`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        blocks: resolveBlocks(op.blocks, idMap),
        temporal,
      }),
    });
    return;
  }

  if (op.kind === 'addAlias') {
    const pageId = idMap.get(op.pageKey);
    if (!pageId) throw new Error(`Unknown pageKey ${op.pageKey}`);
    await apiFetch(baseUrl, `/api/campaigns/${campaignSlug}/wiki/${pageId}/aliases`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ alias: op.alias }),
    });
    return;
  }

  if (op.kind === 'createCalendarEvent') {
    if (!calendarId) return;
    await apiFetch(baseUrl, `/api/campaigns/${campaignSlug}/calendars/${calendarId}/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: op.title,
        description: op.description ?? null,
        visibility: 'PARTY',
        duration: 60,
        temporal,
      }),
    });
  }
}

export interface ExecuteSeedPlanOptions {
  baseUrl: string;
  campaignSlug: string;
  bearerToken: string;
  concurrency?: number;
  retry?: { maxAttempts: number; backoffMs: number[] };
  onProgress?: (p: { completed: number; total: number; index: number; kind: string }) => void;
  resumeFrom?: number;
  bootstrapIdMap?: Map<string, string>;
  calendarId?: string | null;
}

export interface ExecuteSeedPlanResult {
  idMap: Map<string, string>;
  completed: number;
  total: number;
}

export async function executeSeedPlan(
  plan: SeedPlan,
  options: ExecuteSeedPlanOptions,
): Promise<ExecuteSeedPlanResult> {
  const {
    baseUrl,
    campaignSlug,
    bearerToken,
    concurrency = 4,
    retry = DEFAULT_RETRY,
    onProgress,
    resumeFrom = 0,
    bootstrapIdMap,
    calendarId = null,
  } = options;

  const idMap = new Map(bootstrapIdMap ?? []);
  const ops = plan.ops.slice(resumeFrom);
  let completed = resumeFrom;
  const total = plan.ops.length;

  async function worker(queue: { op: SeedOp; index: number }[]): Promise<void> {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const { op, index } = item;
      let attempt = 0;
      for (;;) {
        try {
          await runOp(op, { baseUrl, campaignSlug, bearerToken, idMap, calendarId });
          completed += 1;
          if (onProgress) onProgress({ completed, total, index, kind: op.kind });
          break;
        } catch (err) {
          attempt += 1;
          if (attempt >= retry.maxAttempts) throw err;
          await sleep(retry.backoffMs[Math.min(attempt - 1, retry.backoffMs.length - 1)]);
        }
      }
    }
  }

  const queue = ops.map((op, i) => ({ op, index: resumeFrom + i }));
  const workers = Array.from({ length: Math.min(concurrency, queue.length || 1) }, () =>
    worker(queue),
  );
  await Promise.all(workers);

  return { idMap, completed, total };
}
