const WIKI_PAGE_BEFORE_CREATE = new Set([
  'title',
  'blocks',
  'folderId',
  'parentId',
  'icon',
  'tags',
  'metadata',
]);

const WIKI_PAGE_BEFORE_UPDATE = new Set([
  'title',
  'blocks',
  'folderId',
  'parentId',
  'icon',
  'tags',
  'metadata',
  'visibility',
  'isSessionNote',
]);

const NOTEBOOK_ARC_BEFORE_CREATE = new Set(['title', 'description', 'color', 'metadata']);

const DENY_ALWAYS = new Set([
  'campaignId',
  'id',
  'createdById',
  'createdAt',
  'updatedAt',
  'ownerId',
  'userId',
]);

function allowlistKey(entity: string, phase: string): Set<string> | null {
  if (entity === 'wikiPage' && phase === 'beforeCreate') return WIKI_PAGE_BEFORE_CREATE;
  if (entity === 'wikiPage' && phase === 'beforeUpdate') return WIKI_PAGE_BEFORE_UPDATE;
  if (entity === 'notebookArc' && phase === 'beforeCreate') return NOTEBOOK_ARC_BEFORE_CREATE;
  return null;
}

export function applyInterceptorAllowlist(
  entity: string,
  phase: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const allowed = allowlistKey(entity, phase);
  if (!allowed) {
    return payload;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (DENY_ALWAYS.has(key)) continue;
    if (allowed.has(key)) {
      result[key] = value;
    }
  }
  return result;
}
