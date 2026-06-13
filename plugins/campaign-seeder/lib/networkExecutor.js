/**
 * Phase 2 executor — applies SeedPlan over HTTP without touching RNG.
 */

const DEFAULT_RETRY = { maxAttempts: 3, backoffMs: [250, 1000, 3000] };

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveLinkIds(markdown, idMap) {
  if (typeof markdown !== 'string') return markdown;
  return markdown.replace(/\{\{([^}]+)\}\}/g, (_m, key) => {
    const pageId = idMap.get(key.trim());
    return pageId ?? '';
  });
}

function resolveBlocks(blocks, idMap) {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map((block) => {
    if (!block?.content?.markdown) return block;
    return {
      ...block,
      content: {
        ...block.content,
        markdown: resolveLinkIds(block.content.markdown, idMap),
      },
    };
  });
}

async function apiFetch(baseUrl, path, options) {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const err = new Error(typeof body?.error === 'string' ? body.error : `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function runOp(op, ctx) {
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
    const parentId = op.parentKey ? idMap.get(op.parentKey) ?? null : null;
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
    const pageId = result?.page?.id;
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

/**
 * @param {import('./seedPlan.js').SeedPlan} plan
 * @param {object} options
 */
export async function executeSeedPlan(plan, options) {
  const {
    baseUrl,
    campaignSlug,
    bearerToken,
    concurrency = 4,
    retry = DEFAULT_RETRY,
    onProgress,
    resumeFrom = 0,
    bootstrapIdMap,
    calendarId,
  } = options;

  const idMap = new Map(bootstrapIdMap ?? []);
  const ops = plan.ops.slice(resumeFrom);
  let completed = resumeFrom;
  const total = plan.ops.length;

  async function worker(queue) {
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
