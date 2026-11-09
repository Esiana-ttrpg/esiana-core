import assert from 'node:assert/strict';
import type { prisma } from '../lib/prisma.js';
import { ContentPresenceEntityType } from '../../../shared/contentPresence.js';

export async function createCharacterAudienceFixture(db: typeof prisma, input: {
  campaignId: string; categoryId: string; ownerId: string; playerId: string; secretPageId: string;
}) {
  const { campaignId, categoryId, ownerId, playerId, secretPageId } = input;
  const id = (name: string) => `${name}-${campaignId}`;
  const characterId = id('character');
  const friendId = id('friend');
  const hiddenCharacterId = id('hidden-character');
  const locationId = id('location');
  const sessionPageId = id('session-page');
  const sessionId = id('session');
  const canvasId = id('canvas');
  const privateTabId = id('private-tab');
  const hiddenTabId = id('hidden-tab');
  const pluginTabId = id('plugin-tab');
  const privatePluginTabId = id('private-plugin-tab');
  const fieldId = id('field');
  const questId = id('character-quest');
  const unrelatedQuestId = id('unrelated-character-quest');
  const block = (name: string, markdown: string, visibility = 'Party') => ({ id: name, type: 'text-tiptap', visibility, content: { markdown } });
  await db.wikiPage.createMany({ data: [
    { id: locationId, campaignId, title: 'Shared harbor', visibility: 'Party', workspace: 'LOCATIONS', pathKey: 'shared-harbor', blocks: [] },
    { id: characterId, campaignId, title: 'Mira the navigator', parentId: categoryId, templateType: 'CHARACTER', visibility: 'Party',
      workspace: 'CHARACTERS', pathKey: 'mira-the-navigator', ownerType: 'USER', ownerUserId: playerId,
      metadata: { entityCategory: 'characters', profession: 'Navigator', knownFor: 'Reading the tide', currentLocationId: locationId,
        primaryAffiliationId: secretPageId, familyId: secretPageId, ancestryId: secretPageId, ancestry: 'Hidden ancestry sentinel',
        appearance: { pronouns: 'she/they', summary: 'A blue traveling cloak' },
        quickInfo: [{ key: 'Location', value: 'Hidden cached location sentinel' }, { key: 'Affiliation', value: 'Hidden cached affiliation sentinel' }],
        socialLinks: [{ id: 'shared-social', targetPageId: friendId, targetType: 'CHARACTER', narrativeType: 'ally', visibility: 'PARTY', context: 'Shared friendship' },
          { id: 'overridden-social', targetPageId: friendId, targetType: 'CHARACTER', narrativeType: 'ally', visibility: 'PARTY', context: 'Hidden overridden relation sentinel' },
          { id: 'private-social', targetPageId: friendId, targetType: 'CHARACTER', narrativeType: 'rival', visibility: 'DM_ONLY', context: 'Hidden social sentinel' }],
        parentLinks: [{ id: 'private-parent', targetCharacterId: secretPageId, visibility: 'PARTY', relationshipType: 'BIOLOGICAL' }],
        orgAffiliations: [{ id: 'private-affiliation', orgId: secretPageId, visibility: 'PARTY', role: 'Hidden affiliation sentinel' }],
        locationRelations: [{ locationPageId: secretPageId, role: 'resident' }],
        gmNotes: 'Hidden character notes sentinel', eraTrajectories: [{ note: 'Hidden trajectory sentinel' }] },
      blocks: [block('character-shared', 'Mira charts forgotten coasts.'), block('character-private', 'Hidden character block sentinel', 'DM_Only')] },
    { id: friendId, campaignId, parentId: categoryId, title: 'Rowan the archivist', templateType: 'CHARACTER', visibility: 'Public',
      workspace: 'CHARACTERS', pathKey: 'rowan-the-archivist', metadata: { entityCategory: 'characters', currentLocationId: secretPageId, profession: 'Archivist' }, blocks: [] },
    { id: hiddenCharacterId, campaignId, parentId: categoryId, title: 'Hidden character sentinel', templateType: 'CHARACTER', visibility: 'DM_Only',
      metadata: { entityCategory: 'characters' }, blocks: [] },
    { id: id('hidden-child'), campaignId, parentId: secretPageId, title: 'Hidden character ancestry sentinel', templateType: 'CHARACTER', visibility: 'Party',
      metadata: { entityCategory: 'characters' }, blocks: [] },
    { id: id('future-character'), campaignId, parentId: categoryId, title: 'Future character sentinel', templateType: 'CHARACTER', visibility: 'Party', metadata: { entityCategory: 'characters' }, blocks: [] },
    { id: sessionPageId, campaignId, title: 'Shared character session', templateType: 'SESSION_NOTE', visibility: 'Party',
      metadata: { isSessionAnchor: true, timelinePointId: sessionId, sessionGroupId: sessionId, locationPageId: locationId },
      blocks: [block('shared-session-block', `/campaigns/${campaignId}/wiki/${characterId} met /campaigns/${campaignId}/wiki/${friendId} at the harbor.`),
        block('private-session-block', `Hidden session snippet sentinel /campaigns/${campaignId}/wiki/${hiddenCharacterId}`, 'DM_Only')] },
    { id: id('hidden-session-page'), campaignId, title: 'Hidden character session sentinel', templateType: 'SESSION_NOTE', visibility: 'DM_Only',
      blocks: [block('private-session', `/campaigns/${campaignId}/wiki/${characterId}`)] },
    { id: questId, campaignId, title: 'Chart the old harbor', templateType: 'QUEST', visibility: 'Party', blocks: [], metadata: { questStatus: 'ACTIVE', questGiverId: characterId } },
    { id: unrelatedQuestId, campaignId, title: 'Unrelated shared quest', templateType: 'QUEST', visibility: 'Party', blocks: [], metadata: { questStatus: 'ACTIVE', questGiverId: characterId } },
  ] });
  await db.contentPresenceState.create({ data: { campaignId, entityType: ContentPresenceEntityType.WIKI_PAGE, entityId: id('future-character'), state: 'REVEALED', availableFromEpochMinute: 999999999999n } });
  await db.campaignSessionTimeline.createMany({ data: [
    { id: sessionId, campaignId, wikiPageId: sessionPageId, authorId: ownerId, sequenceOrder: 20 },
    { id: id('hidden-session'), campaignId, wikiPageId: id('hidden-session-page'), authorId: ownerId, sequenceOrder: 21 },
  ] });
  await db.wikiLink.createMany({ data: [
    { campaignId, sourcePageId: sessionPageId, targetPageId: characterId },
    { campaignId, sourcePageId: sessionPageId, targetPageId: friendId },
    { campaignId, sourcePageId: id('hidden-session-page'), targetPageId: characterId },
  ] });
  // Both pages are shared; the mention relationship is independently restricted.
  await db.entityRelation.create({ data: { campaignId, sourceEntityType: 'wiki_page', sourceEntityId: sessionPageId,
    targetEntityType: 'wiki_page', targetEntityId: friendId, relationKind: 'WIKI_REFERENCE', sourceDomain: 'wiki',
    sourceRecordKey: `hidden-session-reference:${sessionPageId}:${friendId}`, sourcePageId: sessionPageId, visibility: 'DM_ONLY' } });
  await db.entityRelation.createMany({ data: [
    { campaignId, sourceEntityType: 'wiki_page', sourceEntityId: characterId, targetEntityType: 'wiki_page', targetEntityId: friendId,
      relationKind: 'CHARACTER_SOCIAL', sourceDomain: 'wiki_metadata', sourceRecordKey: `character_social:${characterId}:shared-social`, sourcePageId: characterId, visibility: 'PARTY',
      payload: { semantics: { narrativeType: 'ally' } } },
    { campaignId, sourceEntityType: 'wiki_page', sourceEntityId: characterId, targetEntityType: 'wiki_page', targetEntityId: friendId,
      relationKind: 'CHARACTER_SOCIAL', sourceDomain: 'wiki_metadata', sourceRecordKey: `character_social:${characterId}:overridden-social`, sourcePageId: characterId, visibility: 'DM_ONLY' },
    { campaignId, sourceEntityType: 'wiki_page', sourceEntityId: unrelatedQuestId, targetEntityType: 'wiki_page', targetEntityId: characterId,
      relationKind: 'QUEST_GIVER', sourceDomain: 'wiki_metadata', sourceRecordKey: `quest_giver:${unrelatedQuestId}`, sourcePageId: unrelatedQuestId, visibility: 'DM_ONLY' },
  ] });
  await db.characterPageTab.createMany({ data: [
    { id: canvasId, campaignId, characterPageId: characterId, origin: 'CUSTOM', renderMode: 'CANVAS', title: 'Shared voyages', displayOrder: 100, visibility: 'Party',
      blocks: [block('canvas-shared', 'Shared voyage text'), block('canvas-private', 'Hidden canvas sentinel', 'DM_Only'), block('canvas-unrevealed', 'Hidden unrevealed canvas sentinel'),
        { id: 'canvas-ref', type: 'wiki-infobox', content: { rows: [{ pageId: secretPageId, label: 'Hidden canvas reference sentinel' }] } }] },
    { id: privateTabId, campaignId, characterPageId: characterId, origin: 'CUSTOM', renderMode: 'CANVAS', title: 'Hidden tab sentinel', displayOrder: 110, visibility: 'DM_Only', blocks: [] },
    { id: hiddenTabId, campaignId, characterPageId: characterId, origin: 'CUSTOM', renderMode: 'CANVAS', title: 'Hidden inactive tab sentinel', displayOrder: 120, visibility: 'Party', hidden: true, blocks: [] },
  ] });
  await db.contentPresenceState.create({ data: { campaignId, entityType: ContentPresenceEntityType.WIKI_BLOCK, entityId: characterId, subEntityId: 'canvas-unrevealed', state: 'HIDDEN' } });
  for (const [tabId, visibility, title] of [[pluginTabId, 'Party', 'Shared plugin page'], [privatePluginTabId, 'DM_Only', 'Hidden plugin page sentinel']]) {
    const state = await db.pluginCharacterPageState.create({ data: { campaignId, characterPageId: characterId, pluginId: 'fixture-plugin', sourceKey: tabId,
      pluginSchemaVersion: 1, providerState: 'AVAILABLE', pluginData: { description: 'Shared plugin data', gmNotes: 'Hidden plugin data sentinel',
        references: [{ targetPageId: secretPageId, label: 'Hidden plugin reference sentinel' }] } } });
    await db.characterPageTab.create({ data: { id: tabId, campaignId, characterPageId: characterId, origin: 'PLUGIN', renderMode: 'CANVAS', title,
      displayOrder: 130, visibility, pluginStateId: state.id, blocks: [] } });
  }
  await db.characterField.createMany({ data: [
    { id: fieldId, campaignId, characterPageId: characterId, fieldKey: 'shared', origin: 'CUSTOM', label: 'Shared calling', fieldType: 'STRING', value: 'Cartographer' },
    { campaignId, characterPageId: characterId, pageTabId: privateTabId, fieldKey: 'private', origin: 'CUSTOM', label: 'Hidden field sentinel', fieldType: 'STRING', value: 'Hidden field value sentinel' },
    { campaignId, characterPageId: characterId, fieldKey: 'reference', origin: 'CUSTOM', label: 'Shared references', fieldType: 'JSON', value: { targetPageId: secretPageId, label: 'Hidden field reference sentinel' } },
  ] });
  return { categoryId, characterId, friendId, hiddenCharacterId, locationId, sessionId, canvasId, privateTabId, hiddenTabId, pluginTabId, privatePluginTabId, fieldId, questId };
}

export async function verifyCharacterAudienceHttp(input: {
  base: string; fixture: Awaited<ReturnType<typeof createCharacterAudienceFixture>>;
  managerCookies: string[]; playerCookie: string; outsiderCookie: string; otherPageId: string; secretPageId: string;
}) {
  const { base, fixture: f } = input;
  const paths = [`/wiki/character-hub/${f.categoryId}`, `/wiki/${f.characterId}`, '/workspace/characters/mira-the-navigator',
    `/wiki/${f.characterId}/entity-pages`, `/wiki/${f.characterId}/character-pages`, `/wiki/${f.characterId}/character-fields`,
    `/wiki/${f.characterId}/character-pages/${f.pluginTabId}/plugin-data`, `/wiki/${f.characterId}/backlinks`,
    `/wiki/${f.characterId}/outlinks`, `/wiki/${f.characterId}/preview`, `/wiki/${f.characterId}/link-integrity`,
    `/entity-graph?entityType=wiki_page&entityId=${f.characterId}&includeSuppressed=true`];
  const get = async (path: string, cookie: string | undefined, preview = true) => {
    const response = await fetch(`${base}${path}${preview ? `${path.includes('?') ? '&' : '?'}previewAsPlayer=true` : ''}`, { headers: cookie ? { cookie } : {} });
    const text = await response.text();
    return { response, text, json: () => JSON.parse(text) };
  };
  for (const cookie of [...input.managerCookies, input.playerCookie]) {
    for (const path of paths) {
      const result = await get(path, cookie);
      assert.equal(result.response.status, 200, `${path}: ${result.text}`);
      assert.doesNotMatch(result.text, /Hidden [\w -]*sentinel|Future character sentinel/);
      assert.doesNotMatch(result.text, new RegExp(`${input.secretPageId}|${f.hiddenCharacterId}`));
      if (path.includes('character-hub')) {
        const hub = result.json();
        assert.deepEqual(hub.children.map((page: any) => page.id).sort(), [f.characterId, f.friendId].sort());
        assert.equal(hub.locationCounts.reduce((sum: number, row: any) => sum + row.count, 0), 2);
        assert.equal(hub.characterContext[f.characterId].locationTitle, 'Shared harbor');
        assert.equal(hub.characterContext[f.characterId].identityLine, 'Navigator');
        assert.equal(hub.characterContext[f.friendId].locationPageId, null);
        assert.equal(hub.latestSession.id, f.sessionId);
        assert.equal(hub.characterContext[f.characterId].lastSeen.sessionId, f.sessionId);
        assert.deepEqual(hub.characterContext[f.characterId].coSeenWith, []);
        assert.equal(hub.characterContext[f.friendId].lastSeen, null);
        assert.deepEqual(hub.latestSession.mentionedCharacterIds, [f.characterId]);
        assert.deepEqual(hub.characterContext[f.characterId].activeQuests.map((row: any) => row.id), [f.questId]);
        assert.equal(hub.discoverySummary, null);
      }
      if (path === `/wiki/${f.characterId}`) {
        assert.equal(result.json().metadata.profession, 'Navigator');
        assert.equal(result.json().metadata.socialLinks.length, 1);
        assert.equal(result.json().metadata.primaryAffiliationId, null);
        assert.equal(result.json().metadata.quickInfo.find((row: any) => row.key === 'Location').value, 'Shared harbor');
      }
      if (path.startsWith('/entity-graph?')) assert.match(result.text, new RegExp(f.friendId));
      if (path.endsWith('/entity-pages')) {
        const pages = result.json().pages;
        assert.ok(pages.some((page: any) => page.id === f.canvasId));
        assert.ok(!pages.some((page: any) => ['discovery', 'trajectory', 'continuity'].includes(page.coreKey)));
        // Actual ownership capability is independent of this read perspective.
        assert.equal(result.json().canEdit, true);
        assert.match(result.text, /Shared voyage text/);
      }
    }
    for (const pageId of [f.hiddenCharacterId, input.otherPageId, input.secretPageId]) {
      for (const suffix of ['', '/entity-pages', '/character-fields']) {
        const result = await get(`/wiki/${pageId}${suffix}`, cookie);
        assert.ok([403, 404].includes(result.response.status), `${pageId}${suffix}: ${result.text}`);
      }
    }
    const privatePlugin = await get(`/wiki/${f.characterId}/character-pages/${f.privatePluginTabId}/plugin-data`, cookie);
    assert.ok([403, 404].includes(privatePlugin.response.status));
  }
  for (const cookie of input.managerCookies) {
    const gm = await get(`/wiki/character-hub/${f.categoryId}`, cookie, false);
    assert.equal(gm.response.status, 200);
    assert.match(gm.text, /Hidden character sentinel/);
    const tabs = await get(`/wiki/${f.characterId}/entity-pages`, cookie, false);
    assert.match(tabs.text, /Hidden tab sentinel/);
  }
  const ordinary = await get(`/wiki/character-hub/${f.categoryId}`, input.playerCookie, false);
  assert.equal(ordinary.response.status, 200);
  assert.doesNotMatch(ordinary.text, /Hidden [\w -]*sentinel|Future character sentinel/);
  const own = await get(`/wiki/${f.characterId}`, input.playerCookie, false);
  assert.equal(own.response.status, 200);
  assert.equal(own.json().canEdit, true);
  const other = await get(`/wiki/${f.friendId}`, input.playerCookie, false);
  assert.equal(other.json().canEdit, false);
  const update = (pageId: string) => fetch(`${base}/wiki/${pageId}`, { method: 'PATCH', headers: { cookie: input.playerCookie, 'content-type': 'application/json' }, body: JSON.stringify({ title: pageId === f.characterId ? 'Mira the navigator' : 'Unauthorized change' }) });
  assert.equal((await update(f.characterId)).status, 200);
  assert.equal((await update(f.friendId)).status, 403);
  for (const cookie of [input.outsiderCookie, undefined]) {
    const denied = await get(`/wiki/character-hub/${f.categoryId}`, cookie);
    assert.ok([401, 403, 404].includes(denied.response.status));
  }
  for (const query of ['previewAsPlayer=invalid', 'previewAsPlayer=true&previewAsPlayer=false', 'previewAsPlayer%5Bmode%5D=true']) {
    const result = await get(`/wiki/character-hub/${f.categoryId}?${query}`, input.managerCookies[0], false);
    assert.equal(result.response.status, 400);
  }
}
