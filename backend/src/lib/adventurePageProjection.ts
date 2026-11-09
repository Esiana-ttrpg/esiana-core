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
import { characterAudienceMetadata } from './characterAudienceMetadata.js';
import { parseSessionNoteMetadata } from './sessionNoteMetadata.js';
import { isCharacterEntityPage } from '../../../shared/resolveCanonicalEntityCategory.js';
import { reconcileCharacterIndexFromMetadata } from './characterMetadata.js';

type Page = { id: string; parentId: string | null; visibility: string; metadata: unknown; blocks: unknown; pathKey?: string | null; workspace?: string | null; title?: string; templateType?: string };
const pageReferenceKey = /(?:^pageIds?$|PageIds?$|EntityIds?$|^targetId$|^questGiverId$|^factionId$|^currentLocationId$|^primaryAffiliationId$|^ancestryId$|^lineageId$|^familyId$|^targetCharacterId$|^orgId$)/;

export function redactAdventureReferenceText(text: string, allowed: (id: string, route?: string) => boolean): string {
  const path = /\/(?:c|campaigns?)\/[\w-]+\/([\w-]+)\/([\w-]+)/i;
  let result = text.replace(/<span\b[^>]*data-id=(["'])([^"']+)\1[^>]*>[\s\S]*?<\/span>/gi,
    (match, _quote: string, id: string) => allowed(id) ? match : '');
  result = result.replace(/\[[^\]\n]*\]\((\/(?:c|campaigns?)\/[\w-]+\/[\w-]+\/[\w-]+)[^)]*\)/gi,
    (match, url: string) => { const target = path.exec(url); return target && allowed(target[2]!, target[1]!) ? match : ''; });
  result = result.replace(/<a\b[^>]*href=["']([^"']*)["'][^>]*>[\s\S]*?<\/a>/gi,
    (match, url: string) => { const target = path.exec(url); return target && !allowed(target[2]!, target[1]!) ? '' : match; });
  return result.replace(/\/(?:c|campaigns?)\/[\w-]+\/([\w-]+)\/([\w-]+)/gi,
    (match, route: string, id: string) => allowed(id, route) ? match : '');
}

/** One projection for page documents and the inputs to Adventure derivations. */
export async function projectAdventurePages<T extends Page>(
  campaignId: string, pages: readonly T[], canView: (visibility: string) => boolean,
): Promise<T[]> {
  return (await loadAdventurePageProjection(campaignId, pages, canView)).pages;
}

/** Reuse the same authorized inventory for attached character tabs and fields. */
export async function loadAdventurePageProjection<T extends Page>(
  campaignId: string, pages: readonly T[], canView: (visibility: string) => boolean,
) {
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
  for (const session of sessionPages) if (sessionIds.has(session.id) && ids.has(session.wikiPageId)) {
    routeIds.set(`notes:${session.id}`, session.wikiPageId);
  }
  const [presence, campaign, relations] = await Promise.all([
    prisma.contentPresenceState.findMany({ where: { campaignId, entityType: ContentPresenceEntityType.WIKI_BLOCK } }),
    prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { currentEpochMinute: true } }),
    prisma.entityRelation.findMany({ where: { campaignId, visibility: { not: null } },
      select: { id: true, sourceRecordKey: true, visibility: true, relationKind: true,
        sourceEntityType: true, sourceEntityId: true, targetEntityType: true, targetEntityId: true } }),
  ]);
  const hiddenRelationIds = new Set(relations.filter(row => !canView(row.visibility!))
    .flatMap(row => [row.id, row.sourceRecordKey]));
  const hiddenWikiPairs = new Set(relations.filter(row => row.relationKind === 'WIKI_REFERENCE' &&
    row.sourceEntityType === 'wiki_page' && row.targetEntityType === 'wiki_page' && !canView(row.visibility!))
    .map(row => `${row.sourceEntityId}:${row.targetEntityId}`));
  const hidden = new Set(presence.filter(row => row.state !== 'REVEALED' ||
    (row.availableFromEpochMinute != null && row.availableFromEpochMinute > campaign.currentEpochMinute))
    .map(row => `${row.entityId}:${row.subEntityId ?? ''}`));

  // References are authorized against the complete campaign projection, including
  // ancestors, revelation and lifecycle, rather than against target visibility alone.
  function project(value: unknown, key = '', sourceId = '', pageMetadata = false): unknown {
    const allowed = (id: string) => ids.has(id) && (pageMetadata || !hiddenWikiPairs.has(`${sourceId}:${id}`));
    const allowedRoute = (id: string, route?: string) => allIds.has(id) ? allowed(id) :
      !!route && allowed(routeIds.get(`${route.toLowerCase()}:${id}`) ?? '');
    if (typeof value === 'string') {
      const relationKeys: Record<string, string> = {
        questGiverId: `quest_giver:${sourceId}`,
        factionId: `quest_faction:${sourceId}`,
        participantPageIds: `scene_participant:${sourceId}:${value}`,
        linkedQuestPageIds: `scene_quest:${sourceId}:${value}`,
      };
      if (relationKeys[key] && hiddenRelationIds.has(relationKeys[key])) return null;
      if (pageReferenceKey.test(key)) return allowed(value) ? value : null;
      return redactAdventureReferenceText(value, allowedRoute);
    }
    if (Array.isArray(value)) return value.map(item => project(item, key || 'item', sourceId, pageMetadata)).filter(item => item != null);
    if (!value || typeof value !== 'object') return value;
    const record = value as Record<string, unknown>;
    if (typeof record.id === 'string' && (hidden.has(`${sourceId}:${record.id}`) || hidden.has(`${record.id}:`))) return null;
    if (record.isPrivate === true || (typeof record.visibility === 'string' && !canView(record.visibility))) return null;
    if ([record.id, record.relationId, record.sourceRecordKey].some(id => typeof id === 'string' && hiddenRelationIds.has(id))) return null;
    // Do not retain the cached label/description of an inaccessible reference.
    if (key !== '' && Object.entries(record).some(([name, item]) => pageReferenceKey.test(name) &&
      typeof item === 'string' && !allowed(item))) return null;
    if (['wikiLink', 'mention'].includes(String(record.type))) {
      const attrs = record.attrs as Record<string, unknown> | undefined;
      if (attrs?.id && !allowed(String(attrs.id))) return null;
    }
    return Object.fromEntries(Object.entries(record)
      .filter(([name]) => !['gmNotes', 'dmRewardsText'].includes(name))
      .map(([name, item]) => [name, project(item, name, sourceId, pageMetadata)]));
  }

  const entityPages = visible.map(page => ({ ...page, title: page.title ?? '', templateType: page.templateType ?? 'DEFAULT' }));
  const entityById = new Map(entityPages.map(page => [page.id, page]));
  const projectedPages = visible.map(page => {
    const raw = page.metadata && typeof page.metadata === 'object' ? page.metadata as Record<string, unknown> : {};
    // Unknown plugin/editor metadata has no Party disclosure contract.
    let metadata: Record<string, unknown> = {};
    for (const key of ['systemCategoryKey', 'entityCategory', 'icon', 'description', 'summary', 'fields']) {
      if (raw[key] !== undefined) metadata[key] = raw[key];
    }
    const isCharacter = isCharacterEntityPage(entityById.get(page.id)!, entityPages, entityById);
    if (isCharacter) {
      metadata = { ...metadata, ...characterAudienceMetadata(raw, page.id, ids, canView, hiddenRelationIds) };
    } else {
      if (isQuestMetadataPresent(raw)) metadata = { ...metadata, ...sanitizeQuestMetadataForRole(parseQuestMetadata(raw), false) };
      if (isSceneMetadataPresent(raw)) metadata = { ...metadata, ...restrictSceneMetadata(parseSceneMetadata(raw), ids, sessionIds) };
      if (isThreadMetadataPresent(raw)) metadata = { ...metadata, ...restrictThreadMetadata(parseThreadMetadata(raw), ids, sessionIds) };
      if (isArcMetadataPresent(raw)) metadata = { ...metadata, ...parseArcMetadata(raw) };
    }
    const session = parseSessionNoteMetadata(raw);
    if (session.timelinePointId || session.sessionGroupId || session.isSessionAnchor || session.isSessionAuthor) {
      metadata = { ...metadata, ...session,
        locationPageId: session.locationPageId && ids.has(session.locationPageId) ? session.locationPageId : undefined,
        timelinePointId: session.timelinePointId && sessionIds.has(session.timelinePointId) ? session.timelinePointId : undefined,
        sessionGroupId: session.sessionGroupId && sessionIds.has(session.sessionGroupId) ? session.sessionGroupId : undefined };
    }
    const blocks = Array.isArray(page.blocks) ? page.blocks.filter(block => block && typeof block === 'object' &&
      !hidden.has(`${page.id}:`) && !hidden.has(`${page.id}:${block.id ?? ''}`) && !hidden.has(`${block.id}:`)) : [];
    const projectedMetadata = project(metadata, '', page.id, true) as Record<string, unknown> | null;
    if (isCharacter && projectedMetadata) reconcileCharacterIndexFromMetadata(projectedMetadata, {
      resolvePageTitle: id => entityById.get(id)?.title ?? null,
    });
    return { ...page, metadata: projectedMetadata, blocks: project(blocks, '', page.id) };
  });
  return {
    pages: projectedPages,
    projectContent: (value: unknown, sourceId: string) => {
      // Attached canvas blocks share their canonical page's block revelation policy.
      const content = Array.isArray(value) ? value.filter(item => !item || typeof item !== 'object' ||
        (!hidden.has(`${sourceId}:`) && !hidden.has(`${sourceId}:${item.id ?? ''}`) && !hidden.has(`${item.id}:`))) : value;
      return project(content, 'content', sourceId);
    },
  };
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
