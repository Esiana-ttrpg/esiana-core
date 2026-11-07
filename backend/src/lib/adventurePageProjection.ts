import { extractWikiLinkTargetIdsFromBlocks } from './wikiLinkExtract.js';
import { prisma } from './prisma.js';
import { filterAdventurePreviewPages } from './adventureAudience.js';
import { ContentPresenceEntityType } from '../../../shared/contentPresence.js';
import { isQuestMetadataPresent, parseQuestMetadata, sanitizeQuestMetadataForRole } from './questMetadata.js';
import { isSceneMetadataPresent, parseSceneMetadata } from './sceneMetadata.js';
import { isThreadMetadataPresent, parseThreadMetadata } from './threadMetadata.js';
import { restrictSceneMetadata, restrictThreadMetadata } from './adventureAudienceMetadata.js';
import { isArcMetadataPresent, parseArcMetadata } from './arcMetadata.js';

type Page = { id: string; parentId: string | null; visibility: string; metadata: unknown; blocks: unknown };
const pageReferenceKey = /(?:^pageIds?$|PageIds?$|EntityIds?$|^questGiverId$|^factionId$)/;

/** One projection for page documents and the inputs to Adventure derivations. */
export async function projectAdventurePages<T extends Page>(
  campaignId: string, pages: readonly T[], canView: (visibility: string) => boolean,
): Promise<T[]> {
  const visible = await filterAdventurePreviewPages(campaignId, pages, canView);
  const ids = new Set(visible.map(page => page.id));
  const [presence, campaign, relations, sessions] = await Promise.all([
    prisma.contentPresenceState.findMany({ where: { campaignId, entityType: ContentPresenceEntityType.WIKI_BLOCK } }),
    prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { currentEpochMinute: true } }),
    prisma.entityRelation.findMany({ where: { campaignId }, select: { sourceEntityId: true, targetEntityId: true, visibility: true } }),
    prisma.campaignSessionTimeline.findMany({ where: { campaignId }, select: { id: true, wikiPageId: true } }),
  ]);
  const sessionIds = new Set(sessions.filter(session => ids.has(session.wikiPageId)).map(session => session.id));
  const hidden = new Set(presence.filter(row => row.state !== 'REVEALED' ||
    (row.availableFromEpochMinute != null && row.availableFromEpochMinute > campaign.currentEpochMinute))
    .map(row => `${row.entityId}:${row.subEntityId ?? ''}`));

  const hiddenRelations = new Set(relations.filter(row => !row.visibility || !canView(row.visibility))
    .flatMap(row => [`${row.sourceEntityId}:${row.targetEntityId}`, `${row.targetEntityId}:${row.sourceEntityId}`]));

  // References are authorized against the complete campaign projection, including
  // ancestors, revelation and lifecycle, rather than against target visibility alone.
  function project(value: unknown, key = '', sourceId = ''): unknown {
    const allowed = (id: string) => ids.has(id) && !hiddenRelations.has(`${sourceId}:${id}`);
    if (typeof value === 'string') {
      if (pageReferenceKey.test(key)) return allowed(value) ? value : null;
      let text = value.replace(/<span\b[^>]*data-id="([^"]+)"[^>]*>[\s\S]*?<\/span>/g,
        (match, id: string) => allowed(id) ? match : '');
      text = text.replace(/\[[^\]\n]*\]\((\/(?:c|campaigns?)\/[^/\s]+\/(?:wiki|characters)\/([\w-]+))\)/g,
        (match, _url: string, id: string) => allowed(id) ? match : '');
      text = text.replace(/<a\b[^>]*href=["'][^"']*\/(?:wiki|characters)\/([\w-]+)["'][^>]*>[\s\S]*?<\/a>/gi,
        (match, id: string) => allowed(id) ? match : '');
      return text.replace(/\/(?:c|campaigns?)\/[^/\s]+\/(?:wiki|characters)\/([\w-]+)/g,
        (match, id: string) => allowed(id) ? match : '');
    }
    if (Array.isArray(value)) return value.map(item => project(item, key, sourceId)).filter(item => item != null);
    if (!value || typeof value !== 'object') return value;
    const record = value as Record<string, unknown>;
    if (record.isPrivate === true || (typeof record.visibility === 'string' && !canView(record.visibility))) return null;
    // Do not retain the cached label/description of an inaccessible reference.
    if (('label' in record || 'title' in record) && Object.entries(record).some(([name, item]) => pageReferenceKey.test(name) &&
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
    for (const key of ['systemCategoryKey', 'icon', 'description', 'summary', 'fields']) {
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
    } else if (Array.isArray(value)) value.forEach(item => visit(item, key));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([name, item]) => visit(item, name));
  };
  visit(blocks);
  return [...ids];
}
