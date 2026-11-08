import { extractWikiLinkTargetIdsFromBlocks } from './wikiLinkExtract.js';
import { prisma } from './prisma.js';
import { filterAdventureAudiencePages, filterAdventurePreviewPages } from './adventureAudience.js';
import { ContentPresenceEntityType } from '../../../shared/contentPresence.js';
import { isQuestMetadataPresent, parseQuestMetadata, sanitizeQuestMetadataForRole } from './questMetadata.js';
import { isSceneMetadataPresent, parseSceneMetadata } from './sceneMetadata.js';
import { isThreadMetadataPresent, parseThreadMetadata } from './threadMetadata.js';
import { restrictSceneMetadata, restrictThreadMetadata } from './adventureAudienceMetadata.js';
import { isArcMetadataPresent, parseArcMetadata } from './arcMetadata.js';
import { visibleAdventureSessionIds } from './adventureSessionAudience.js';
import { workspaceToSegment, type CampaignWorkspaceValue } from '../../../shared/campaignWorkspaceRoutes.js';

type Page = { id: string; parentId: string | null; visibility: string; metadata: unknown; blocks: unknown; pathKey?: string | null; workspace?: string | null };
const pageReferenceKey = /(?:^pageIds?$|PageIds?$|EntityIds?$|^targetId$|^questGiverId$|^factionId$)/;

export function redactAdventureReferenceText(text: string, allowed: (id: string, route?: string) => boolean): string {
  const path = /\/(?:c|campaigns?)\/[\w-]+\/(wiki|characters|havens|pages|locations)\/([\w-]+)/i;
  let result = text.replace(/<span\b[^>]*data-id=(["'])([^"']+)\1[^>]*>[\s\S]*?<\/span>/gi,
    (match, _quote: string, id: string) => allowed(id) ? match : '');
  result = result.replace(/\[[^\]\n]*\]\((\/(?:c|campaigns?)\/[\w-]+\/(?:wiki|characters|havens|pages|locations)\/[\w-]+)[^)]*\)/gi,
    (match, url: string) => { const target = path.exec(url); return target && allowed(target[2]!, target[1]!) ? match : ''; });
  result = result.replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>[\s\S]*?<\/a>/gi,
    (match, url: string) => { const target = path.exec(url); return target && !allowed(target[2]!, target[1]!) ? '' : match; });
  return result.replace(/\/(?:c|campaigns?)\/[\w-]+\/(wiki|characters|havens|pages|locations)\/([\w-]+)/gi,
    (match, route: string, id: string) => allowed(id, route) ? match : '');
}

/** One projection for page documents and the inputs to Adventure derivations. */
export async function projectAdventurePages<T extends Page>(
  campaignId: string, pages: readonly T[], canView: (visibility: string) => boolean,
): Promise<T[]> {
  const candidates = await filterAdventurePreviewPages(campaignId, pages, canView);
  const candidateIds = new Set(candidates.map(page => page.id));
  const sessionIds = await visibleAdventureSessionIds(campaignId, candidateIds);
  const sessionPages = await prisma.campaignSessionTimeline.findMany({
    where: { campaignId, wikiPageId: { in: [...candidateIds] } },
    select: { id: true, wikiPageId: true },
  });
  const unavailableSessionPages = new Set(sessionPages.filter(row => !sessionIds.has(row.id)).map(row => row.wikiPageId));
  const visible = filterAdventureAudiencePages(candidates.filter(page => !unavailableSessionPages.has(page.id)), canView);
  const ids = new Set(visible.map(page => page.id));
  const allIds = new Set(pages.map(page => page.id));
  const routeIds = new Map(visible.filter(page => page.pathKey && page.workspace)
    .map(page => [`${workspaceToSegment(page.workspace as CampaignWorkspaceValue)}:${page.pathKey}`, page.id]));
  const [presence, campaign, relations] = await Promise.all([
    prisma.contentPresenceState.findMany({ where: { campaignId, entityType: ContentPresenceEntityType.WIKI_BLOCK } }),
    prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { currentEpochMinute: true } }),
    prisma.entityRelation.findMany({ where: { campaignId, visibility: { not: null } },
      select: { id: true, sourceRecordKey: true, visibility: true } }),
  ]);
  const hiddenRelationIds = new Set(relations.filter(row => !canView(row.visibility!))
    .flatMap(row => [row.id, row.sourceRecordKey]));
  const hidden = new Set(presence.filter(row => row.state !== 'REVEALED' ||
    (row.availableFromEpochMinute != null && row.availableFromEpochMinute > campaign.currentEpochMinute))
    .map(row => `${row.entityId}:${row.subEntityId ?? ''}`));

  // References are authorized against the complete campaign projection, including
  // ancestors, revelation and lifecycle, rather than against target visibility alone.
  function project(value: unknown, key = '', sourceId = ''): unknown {
    const allowed = (id: string) => ids.has(id);
    const allowedRoute = (id: string, route?: string) => allIds.has(id) ? allowed(id) :
      !!route && allowed(routeIds.get(`${route.toLowerCase()}:${id}`) ?? '');
    if (typeof value === 'string') {
      if (pageReferenceKey.test(key)) return allowed(value) ? value : null;
      return redactAdventureReferenceText(value, allowedRoute);
    }
    if (Array.isArray(value)) return value.map(item => project(item, key, sourceId)).filter(item => item != null);
    if (!value || typeof value !== 'object') return value;
    const record = value as Record<string, unknown>;
    if (record.isPrivate === true || (typeof record.visibility === 'string' && !canView(record.visibility))) return null;
    if ([record.id, record.relationId, record.sourceRecordKey].some(id => typeof id === 'string' && hiddenRelationIds.has(id))) return null;
    // Do not retain the cached label/description of an inaccessible reference.
    if (Object.entries(record).some(([name, item]) => pageReferenceKey.test(name) &&
      typeof item === 'string' && !allowed(item))) return null;
    if (['wikiLink', 'mention'].includes(String(record.type))) {
      const attrs = record.attrs as Record<string, unknown> | undefined;
      if (attrs?.id && !allowed(String(attrs.id))) return null;
    }
    return Object.fromEntries(Object.entries(record)
      .filter(([name]) => !['gmNotes', 'dmRewardsText'].includes(name))
      .map(([name, item]) => [name, project(item, name, sourceId)]));
  }

  return visible.map(page => {
    const raw = page.metadata && typeof page.metadata === 'object' ? page.metadata as Record<string, unknown> : {};
    // Unknown plugin/editor metadata has no Party disclosure contract.
    let metadata: Record<string, unknown> = {};
    for (const key of ['systemCategoryKey', 'entityCategory', 'icon', 'description', 'summary', 'fields']) {
      if (raw[key] !== undefined) metadata[key] = raw[key];
    }
    if (isQuestMetadataPresent(raw)) metadata = { ...metadata, ...sanitizeQuestMetadataForRole(parseQuestMetadata(raw), false) };
    if (isSceneMetadataPresent(raw)) metadata = { ...metadata, ...restrictSceneMetadata(parseSceneMetadata(raw), ids, sessionIds) };
    if (isThreadMetadataPresent(raw)) metadata = { ...metadata, ...restrictThreadMetadata(parseThreadMetadata(raw), ids, sessionIds) };
    if (isArcMetadataPresent(raw)) metadata = { ...metadata, ...parseArcMetadata(raw) };
    const blocks = Array.isArray(page.blocks) ? page.blocks.filter(block => block && typeof block === 'object' &&
      !hidden.has(`${page.id}:`) && !hidden.has(`${page.id}:${block.id ?? ''}`) && !hidden.has(`${block.id}:`)) : [];
    return { ...page, metadata: project(metadata, '', page.id), blocks: project(blocks, '', page.id) };
  });
}

/** Structured entity blocks and prose use the same authorized reference inventory. */
export function projectedWikiTargetIds(blocks: unknown): string[] {
  const ids = new Set<string>();
  const visit = (value: unknown, key = '') => {
    if (typeof value === 'string') {
      if (pageReferenceKey.test(key)) ids.add(value);
      for (const id of extractWikiLinkTargetIdsFromBlocks([{ type: 'text-tiptap', content: { markdown: value } }])) ids.add(id);
      for (const match of value.matchAll(/<span\b[^>]*data-id=(["'])([^"']+)\1/gi)) ids.add(match[2]!);
    } else if (Array.isArray(value)) value.forEach(item => visit(item, key));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([name, item]) => visit(item, name));
  };
  visit(blocks);
  return [...ids];
}
