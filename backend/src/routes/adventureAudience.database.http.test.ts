import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import test from 'node:test';
import cookieParser from 'cookie-parser';
import express from 'express';
import { ContentPresenceEntityType } from '../../../shared/contentPresence.js';

test('campaign router returns reduced Party responses and enforces campaign boundaries', async () => {
  assert.ok(process.env.TEST_DATABASE_URL, 'TEST_DATABASE_URL is required for this security test');
  assert.equal((globalThis as { prisma?: unknown }).prisma, undefined,
    'Run separately so the test database is selected before Prisma initialization');
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.NODE_ENV = 'test';
  // An independently generated SQLite client lets this suite use an isolated
  // database without replacing the working tree's generated Prisma client.
  if (process.env.TEST_SQLITE_CLIENT_URL) {
    const { PrismaClient } = await import(process.env.TEST_SQLITE_CLIENT_URL);
    const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3');
    (globalThis as { prisma?: unknown }).prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({ url: process.env.TEST_DATABASE_URL }),
    });
  }
  const { prisma } = await import('../lib/prisma.js');
  const { env } = await import('../config/env.js');
  const { signAuthTokenForUser } = await import('../middleware/auth.js');
  const { campaignScopedRouter } = await import('./campaignScoped.js');
  const { createCharacterAudienceFixture, verifyCharacterAudienceHttp } = await import('./characterAudience.database.fixture.js');
  const stamp = randomUUID();
  const ids = ['owner', 'player', 'outsider', 'writer'].map(name => `${name}-${stamp}`);
  const [ownerId, playerId, outsiderId, writerId] = ids;
  const campaignId = `audience-${stamp}`;
  const handle = `audience-${stamp}`;
  const questsId = `quests-${stamp}`;
  const threadsId = `threads-${stamp}`;
  const charactersId = `characters-${stamp}`;
  const secretPageId = `secret-${stamp}`;
  const hiddenQuestId = `hidden-quest-${stamp}`;
  const otherCampaignId = `other-${stamp}`;
  const emptyCampaignId = `empty-${stamp}`;
  const otherPageId = `other-page-${stamp}`;
  const unrevealedId = `unrevealed-${stamp}`;
  const draftId = `draft-${stamp}`;
  const narrativeSecretId = `narrative-secret-${stamp}`;
  const futureId = `future-${stamp}`;
  const lockedId = `locked-${stamp}`;
  const sceneRootId = `scenes-${stamp}`;
  const sharedSessionId = `shared-session-${stamp}`;
  const hiddenSessionId = `hidden-session-${stamp}`;
  const sceneId = `scene-${stamp}`;
  const linkSourceId = `source-${stamp}`;
  const linkTargetId = `target-${stamp}`;
  const privateTargetId = `private-target-${stamp}`;
  const futureLinkTargetId = `future-link-target-${stamp}`;
  let server: ReturnType<typeof createServer> | undefined;
  try {
    for (const id of ids) await prisma.user.create({ data: { id, email: `${id}@example.invalid` } });
    await prisma.campaign.create({ data: { id: campaignId, handle, name: 'Audience test', campaignOwnerUserId: ownerId,
      discoverability: 'private', members: { create: [{ userId: ownerId, role: 'GAMEMASTER' },
        { userId: playerId, role: 'PARTICIPANT' }, { userId: writerId, role: 'WRITER' }] },
      wikiPages: { create: [
        { id: questsId, title: 'Quests', visibility: 'Party', blocks: [], metadata: { systemCategoryKey: 'quests' } },
        { id: threadsId, title: 'Narrative Threads', visibility: 'Party', blocks: [], metadata: { systemCategoryKey: 'narrative_threads' } },
        { id: charactersId, title: 'Characters', visibility: 'Party', blocks: [], metadata: {} },
        { id: sceneRootId, title: 'Scenes', visibility: 'Party', blocks: [], metadata: { systemCategoryKey: 'narrative_scenes' } },
        { title: 'Public landmark', visibility: 'Public', blocks: [], metadata: {} },
        { title: 'Party landmark', visibility: 'Party', blocks: [], metadata: { hiddenMetadataSentinel: 'private-metadata-sentinel' } },
        { id: unrevealedId, title: 'Unrevealed sentinel', visibility: 'Party', blocks: [], metadata: {} },
        { id: draftId, title: 'Draft sentinel', visibility: 'Party', blocks: [], metadata: {} },
        { id: narrativeSecretId, title: 'Narrative secret sentinel', visibility: 'Party', blocks: [], metadata: {} },
        { id: futureId, title: 'Future sentinel', visibility: 'Party', blocks: [], metadata: {} },
        { id: secretPageId, title: 'Hidden landmark', visibility: 'DM_Only', blocks: [], metadata: {} },
      ] } } });
    for (const [title, parentId, visibility, metadata] of [
      ['Shared quest', questsId, 'Party', { questStatus: 'ACTIVE' }],
      ['Hidden quest sentinel', questsId, 'DM_Only', { questStatus: 'ACTIVE' }],
      ['Shared thread', threadsId, 'Party', { threadKind: 'mystery', threadStatus: 'OPEN' }],
      ['Hidden thread sentinel', threadsId, 'DM_Only', { threadKind: 'mystery', threadStatus: 'OPEN' }],
    ] as const) {
      await prisma.wikiPage.create({ data: { ...(title === 'Hidden quest sentinel' ? { id: hiddenQuestId } : {}), campaignId, title, parentId, visibility, blocks: [], metadata } });
    }
    await prisma.wikiPage.create({ data: { campaignId, parentId: hiddenQuestId, title: 'Hidden ancestor child sentinel',
      visibility: 'Party', blocks: [], metadata: { questStatus: 'ACTIVE' } } });
    await prisma.wikiPage.create({ data: { id: lockedId, campaignId, parentId: questsId, title: 'Locked lifecycle sentinel',
      visibility: 'Party', blocks: [], metadata: { questStatus: 'ACTIVE' } } });
    await prisma.wikiPage.create({ data: { campaignId, parentId: lockedId, title: 'Locked ancestor child sentinel',
      visibility: 'Party', blocks: [], metadata: { questStatus: 'ACTIVE' } } });
    await prisma.narrativeLifecycleState.create({ data: { campaignId, subjectKind: 'quest', subjectId: lockedId, lifecycleState: 'LOCKED' } });
    await prisma.wikiPage.createMany({ data: [
      { id: sceneId, campaignId, parentId: sceneRootId, title: 'Shared scene', visibility: 'Party', blocks: [], metadata: { sceneStatus: 'READY', summary: 'A shared discovery', plannedSessionId: sharedSessionId, playedSessionId: hiddenSessionId } },
      { campaignId, parentId: sceneRootId, title: 'Uninitialized scene sentinel', visibility: 'Party', blocks: [], metadata: {} },
    ] });
    await prisma.wikiPage.createMany({ data: [
      { id: linkTargetId, campaignId, title: 'Shared link target', visibility: 'Party', blocks: [], metadata: {} },
      { id: privateTargetId, campaignId, title: 'Private relationship target', visibility: 'Party', blocks: [], metadata: {} },
      { id: futureLinkTargetId, campaignId, title: 'Future relationship target', visibility: 'Party', blocks: [], metadata: {} },
      { id: linkSourceId, campaignId, workspace: 'PAGES', pathKey: 'shared-source', title: 'Shared link source', visibility: 'Party', metadata: {}, blocks: [
        { id: 'visible-block', type: 'text-tiptap', content: { markdown: `/campaigns/${handle}/wiki/${linkTargetId} /campaigns/${handle}/wiki/${secretPageId}` } },
        { id: 'structured-block', type: 'wiki-infobox', content: { rows: [{ pageId: linkTargetId, label: 'Shared structured reference' }, { pageId: secretPageId, label: 'Secret structured label' }] } },
        { id: 'private-block', type: 'text-tiptap', visibility: 'DM_Only', content: { markdown: `/campaigns/${handle}/wiki/${privateTargetId}` } },
        { id: 'future-block', type: 'text-tiptap', content: { markdown: `/campaigns/${handle}/wiki/${futureLinkTargetId}` } },
      ] },
    ] });
    await prisma.campaignSessionTimeline.createMany({ data: [
      { id: sharedSessionId, campaignId, wikiPageId: linkTargetId, authorId: ownerId, sequenceOrder: 1 },
      { id: hiddenSessionId, campaignId, wikiPageId: secretPageId, authorId: ownerId, sequenceOrder: 2 },
    ] });
    await prisma.pageNarrativeStatus.create({ data: { campaignId, wikiPageId: narrativeSecretId, status: 'SECRET' } });
    await prisma.entityRelation.createMany({ data: [
      { campaignId, sourceEntityType: 'wiki_page', sourceEntityId: linkSourceId, targetEntityType: 'wiki_page', targetEntityId: linkTargetId,
        relationKind: 'WIKI_REFERENCE', sourceDomain: 'wiki', sourceRecordKey: 'shared-edge', sourcePageId: linkSourceId, visibility: 'PARTY' },
      { campaignId, sourceEntityType: 'wiki_page', sourceEntityId: linkSourceId, targetEntityType: 'wiki_page', targetEntityId: privateTargetId,
        relationKind: 'WIKI_REFERENCE', sourceDomain: 'wiki', sourceRecordKey: 'hidden-edge-sentinel', sourcePageId: linkSourceId, visibility: 'DM_ONLY' },
    ] });
    const visibleGroup = await prisma.loreInterpretationGroup.create({ data: {
      campaignId, pageId: linkSourceId, topic: 'Shared interpretation group',
    } });
    const hiddenGroup = await prisma.loreInterpretationGroup.create({ data: {
      campaignId, pageId: linkSourceId, topic: 'Hidden interpretation group sentinel',
    } });
    await prisma.entityHistoricalAlias.createMany({ data: [
      { stableKey: `shared-alias-${stamp}`, campaignId, pageId: linkSourceId, name: 'Shared alias', visibility: 'PARTY' },
      { stableKey: `hidden-alias-${stamp}`, campaignId, pageId: linkSourceId, name: 'Hidden alias sentinel', visibility: 'GM_ONLY' },
      { stableKey: `secret-alias-${stamp}`, campaignId, pageId: linkSourceId, name: 'Secret alias sentinel', visibility: 'PARTY', isSecret: true },
    ] });
    await prisma.loreInterpretationAccount.createMany({ data: [
      { stableKey: `shared-account-${stamp}`, campaignId, pageId: linkSourceId,
        interpretationGroupId: visibleGroup.id, title: 'Shared account', narrative: 'Shared interpretation', visibility: 'PARTY' },
      { stableKey: `hidden-account-${stamp}`, campaignId, pageId: linkSourceId,
        interpretationGroupId: hiddenGroup.id, title: 'Hidden account sentinel', narrative: 'Hidden interpretation', visibility: 'GM_ONLY' },
    ] });
    await prisma.loreClaim.create({ data: {
      stableKey: `shared-claim-${stamp}`, campaignId, pageId: linkSourceId,
      interpretationGroupId: visibleGroup.id, statement: 'Shared claim', visibility: 'PARTY', knowledgeState: 'KNOWN',
      sources: { create: [
        { sourceType: 'WIKI_PAGE', sourceEntityType: 'WIKI_PAGE', sourceEntityId: linkTargetId,
          label: 'Shared source', visibility: 'PARTY' },
        { sourceType: 'WIKI_PAGE', sourceEntityType: 'WIKI_PAGE', sourceEntityId: secretPageId,
          label: 'Hidden source sentinel', visibility: 'PARTY' },
        { sourceType: 'SESSION_NOTE', sourceEntityType: 'SESSION_NOTE', sourceEntityId: hiddenSessionId,
          label: 'Hidden session source sentinel', visibility: 'PARTY' },
      ] },
    } });
    await prisma.loreClaim.createMany({ data: [
      { stableKey: `hidden-claim-${stamp}`, campaignId, pageId: linkSourceId,
        interpretationGroupId: hiddenGroup.id, statement: 'Hidden claim sentinel', visibility: 'GM_ONLY', knowledgeState: 'KNOWN' },
      { stableKey: `undiscovered-claim-${stamp}`, campaignId, pageId: linkSourceId,
        statement: 'Undiscovered claim sentinel', visibility: 'PARTY', knowledgeState: 'UNDISCOVERED' },
    ] });
    await prisma.narrativeLifecycleState.create({ data: { campaignId, subjectKind: 'scene', subjectId: sceneId, lifecycleState: 'DISCOVERED' } });
    await prisma.fantasyCalendar.create({ data: { campaignId, name: 'Shared calendar', isMasterTime: true,
      weekdays: [{ name: 'Dawn', length: 1 }], months: [{ name: 'Bloom', length: 30 }], seasons: [], moons: [], leapDays: [] } });
    await prisma.contentPresenceState.createMany({ data: [
      { campaignId, entityType: ContentPresenceEntityType.WIKI_PAGE, entityId: draftId, state: 'DRAFT' },
      { campaignId, entityType: ContentPresenceEntityType.WIKI_PAGE, entityId: unrevealedId, state: 'HIDDEN' },
      { campaignId, entityType: ContentPresenceEntityType.WIKI_PAGE, entityId: futureId, state: 'REVEALED', availableFromEpochMinute: 999999n },
      { campaignId, entityType: ContentPresenceEntityType.WIKI_BLOCK, entityId: linkSourceId, subEntityId: 'future-block', state: 'REVEALED', availableFromEpochMinute: 999999n },
    ] });
    await prisma.campaignMember.updateMany({ where: { campaignId, userId: playerId }, data: { identityPageId: secretPageId } });
    await prisma.campaign.create({ data: { id: otherCampaignId, handle: otherCampaignId, name: 'Other campaign',
      campaignOwnerUserId: outsiderId, discoverability: 'private', wikiPages: { create: [{ id: otherPageId,
        title: 'Cross campaign sentinel', visibility: 'Party', blocks: [], metadata: { systemCategoryKey: 'quests' } }] } } });
    await prisma.campaign.create({ data: { id: emptyCampaignId, handle: emptyCampaignId, name: 'Empty audience test',
      campaignOwnerUserId: ownerId, discoverability: 'private', members: { create: [
        { userId: ownerId, role: 'GAMEMASTER' }, { userId: writerId, role: 'WRITER' }, { userId: playerId, role: 'PARTICIPANT' }] },
      wikiPages: { create: [{ title: 'Quests', visibility: 'Party', blocks: [], metadata: { systemCategoryKey: 'quests' } },
        { title: 'Threads', visibility: 'Party', blocks: [], metadata: { systemCategoryKey: 'narrative_threads' } }] } } });
    const characterFixture = await createCharacterAudienceFixture(prisma, { campaignId, categoryId: charactersId, ownerId, playerId, secretPageId });
    await prisma.wikiPage.create({ data: { campaignId: emptyCampaignId, title: 'Characters', visibility: 'Party', blocks: [] } });
    const cookies = new Map<string, string>();
    for (const id of ids) {
      const user = await prisma.user.findUniqueOrThrow({ where: { id } });
      cookies.set(id, `${env.cookieName}=${await signAuthTokenForUser(user)}`);
    }
    const app = express();
    app.use(express.json(), cookieParser());
    app.use('/api/campaigns/:campaignHandle', campaignScopedRouter);
    server = createServer(app);
    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}/api/campaigns/${handle}`;
    for (const id of [ownerId, writerId]) {
      const headers = { cookie: cookies.get(id)! };
      for (const [path, expected] of [
        ['/wiki/adventure-hub', 'Shared quest'], [`/wiki/adventure-hub/${questsId}`, 'Shared quest'],
        ['/wiki/quests-hub', 'Shared quest'], [`/wiki/quests-hub/${questsId}`, 'Shared quest'],
        ['/wiki/threads-hub', 'Shared thread'], [`/wiki/threads-hub/${threadsId}`, 'Shared thread'],
        [`/wiki/${linkSourceId}`, 'Shared link source'], ['/workspace/pages/shared-source', 'Shared link source'],
      ]) {
        const response = await fetch(`${base}${path}?previewAsPlayer=true`, { headers });
        const body = await response.text();
        assert.equal(response.status, 200, `${id}: ${path}: ${body}`);
        assert.match(body, new RegExp(expected));
        assert.doesNotMatch(body, /Draft sentinel|Narrative secret sentinel|Secret structured label|Hidden landmark|Hidden quest sentinel|Hidden thread sentinel|Hidden ancestor child sentinel|Locked lifecycle sentinel|Unrevealed sentinel|Future sentinel/);
        assert.doesNotMatch(body, new RegExp(`${secretPageId}|${unrevealedId}|${futureId}|${lockedId}|${privateTargetId}|${futureLinkTargetId}`));
        if (path === `/wiki/${linkSourceId}`) {
          assert.match(body, new RegExp(linkTargetId));
          assert.doesNotMatch(body, /private-block|future-block/);
          assert.equal(JSON.parse(body).canEdit, false);
        }
      }
      for (const query of ['previewAsPlayer=true&previewAsPlayer=false', 'previewAsPlayer=invalid', 'previewAsPlayer%5Bmode%5D=true']) {
        const response = await fetch(`${base}/wiki/adventure-hub?${query}`, { headers });
        assert.equal(response.status, 400);
        assert.doesNotMatch(await response.text(), /Hidden quest sentinel/);
      }
      for (const section of ['scenes', 'sessions', 'scene-timeline', 'arcs', 'investigation', 'timeline']) {
        const response = await fetch(`${base}/wiki/adventure-hub?previewAsPlayer=true&section=${section}`, { headers });
        const body = await response.text();
        assert.equal(response.status, 200, `${section}: ${body}`);
        assert.doesNotMatch(body, /Hidden landmark|Hidden quest sentinel|Hidden thread sentinel|Hidden ancestor child sentinel|Locked lifecycle sentinel|Unrevealed sentinel|Future sentinel|Uninitialized scene sentinel/);
        if (section === 'scenes') {
          assert.match(body, /Shared scene/);
          assert.match(body, new RegExp(sharedSessionId));
        }
        assert.doesNotMatch(body, new RegExp(hiddenSessionId));
      }
      for (const hidden of [draftId, narrativeSecretId, secretPageId, unrevealedId, futureId, lockedId, otherPageId]) {
        const response = await fetch(`${base}/wiki/${hidden}?previewAsPlayer=true`, { headers });
        assert.equal(response.status, 404);
      }
    }
    for (const id of [ownerId, writerId]) {
      for (const requested of ['true', '1']) {
        const response = await fetch(`${base}/wiki/tree?previewAsPlayer=${requested}`, { headers: { cookie: cookies.get(id)! } });
        assert.equal(response.status, 200);
        const body = await response.text();
        assert.match(body, /Party landmark/);
        assert.match(body, /Shared scene/);
        assert.doesNotMatch(body, /Hidden landmark|Hidden ancestor child sentinel|Unrevealed sentinel|Future sentinel|private-metadata-sentinel|Locked lifecycle sentinel|Locked ancestor child sentinel|Uninitialized scene sentinel/);
        assert.doesNotMatch(body, new RegExp(`${secretPageId}|${unrevealedId}|${futureId}|${lockedId}`));
      }
    }
    for (const id of [ownerId, writerId]) {
      const headers = { cookie: cookies.get(id)! };
      for (const path of [`/wiki/${linkSourceId}/preview`, `/wiki/${linkSourceId}/mention-snippet?targetPageId=${linkTargetId}`,
        `/wiki/${linkSourceId}/party-knowledge`, `/wiki/${linkSourceId}/interpretive-summary`,
        `/wiki/${linkSourceId}/historical-aliases`, `/wiki/${linkSourceId}/interpretations`, `/wiki/${linkSourceId}/lore-claims`,
        `/wiki/session-notes/combined?timelinePointId=${sharedSessionId}`,
        '/wiki/link-index', '/wiki/mention-targets', '/adventure/storyboard']) {
        const response = await fetch(`${base}${path}${path.includes('?') ? '&' : '?'}previewAsPlayer=true`, { headers });
        const body = await response.text();
        assert.equal(response.status, 200, `${path}: ${body}`);
        assert.doesNotMatch(body, /Hidden landmark|Hidden quest sentinel|Locked lifecycle sentinel|Unrevealed sentinel|Uninitialized scene sentinel/);
        assert.doesNotMatch(body, new RegExp(secretPageId));
        if (path.startsWith('/wiki/session-notes/combined')) {
          const combined = JSON.parse(body) as { columns: Array<{
            userId: string; identityPageId: string | null; displayName: string | null; label: string; playerContext: string;
          }> };
          const playerColumn = combined.columns.find(column => column.userId === playerId);
          assert.ok(playerColumn);
          assert.equal(playerColumn.identityPageId, null);
          assert.equal(playerColumn.displayName, null);
          assert.equal(playerColumn.label, playerColumn.playerContext);
        }
        if (['historical-aliases', 'interpretations', 'lore-claims', 'party-knowledge'].some(suffix => path.endsWith(suffix))) {
          assert.doesNotMatch(body, /Hidden alias sentinel|Secret alias sentinel|Hidden interpretation group sentinel|Hidden account sentinel|Hidden claim sentinel|Undiscovered claim sentinel|Hidden source sentinel|Hidden session source sentinel/);
          if (path.endsWith('historical-aliases')) assert.match(body, /Shared alias/);
          if (path.endsWith('interpretations')) assert.match(body, /Shared account/);
          if (path.endsWith('lore-claims') || path.endsWith('party-knowledge')) assert.match(body, /Shared claim/);
        }
      }
      const hiddenCombined = await fetch(`${base}/wiki/session-notes/combined?timelinePointId=${hiddenSessionId}&previewAsPlayer=true`, { headers });
      assert.equal(hiddenCombined.status, 404);
      for (const hidden of [secretPageId, unrevealedId, draftId, futureId, otherPageId]) {
        for (const path of ['historical-aliases', 'interpretations', 'lore-claims']) {
          const response = await fetch(`${base}/wiki/${hidden}/${path}?previewAsPlayer=true`, { headers });
          assert.equal(response.status, 404, `${hidden}: ${path}`);
        }
      }
      for (const path of [`/entity-graph?entityType=wiki_page&entityId=${linkSourceId}&includeSuppressed=true`, '/entity-graph/projection']) {
        const response = await fetch(`${base}${path}${path.includes('?') ? '&' : '?'}previewAsPlayer=true`, { headers });
        const body = await response.text();
        assert.equal(response.status, 200, `${path}: ${body}`);
        if (path.startsWith('/entity-graph?')) assert.match(body, new RegExp(linkTargetId));
        assert.doesNotMatch(body, new RegExp(`${secretPageId}|${privateTargetId}|hidden-edge-sentinel`));
      }
      const out = await fetch(`${base}/wiki/${linkSourceId}/outlinks?previewAsPlayer=true`, { headers });
      assert.equal(out.status, 200);
      const outBody = await out.text();
      assert.match(outBody, /Shared link target/);
      assert.doesNotMatch(outBody, new RegExp(`${privateTargetId}|${futureLinkTargetId}|${secretPageId}|Private relationship target|Future relationship target`));
      const back = await fetch(`${base}/wiki/${linkTargetId}/backlinks?previewAsPlayer=true`, { headers });
      assert.equal(back.status, 200);
      assert.match(await back.text(), /Shared link source/);
      const privateBack = await fetch(`${base}/wiki/${privateTargetId}/backlinks?previewAsPlayer=true`, { headers });
      assert.equal(privateBack.status, 200);
      assert.doesNotMatch(await privateBack.text(), /Shared link source/);
      const futureBack = await fetch(`${base}/wiki/${futureLinkTargetId}/backlinks?previewAsPlayer=true`, { headers });
      assert.equal(futureBack.status, 200);
      assert.doesNotMatch(await futureBack.text(), /Shared link source/);
      const hiddenPage = await fetch(`${base}/wiki/${secretPageId}/backlinks?previewAsPlayer=true`, { headers });
      assert.equal(hiddenPage.status, 404);
      const integrity = await fetch(`${base}/wiki/${linkSourceId}/link-integrity?previewAsPlayer=true`, { headers });
      assert.equal(integrity.status, 200);
      assert.doesNotMatch(await integrity.text(), new RegExp(`${privateTargetId}|${secretPageId}`));
    }
    const playerTime = await fetch(`${base}/time-tracking`, { headers: { cookie: cookies.get(playerId)! } });
    assert.equal(playerTime.status, 200);
    const playerTimeData = await playerTime.json();
    assert.match(JSON.stringify(playerTimeData), /Shared calendar/);
    for (const id of [ownerId, writerId]) {
      const response = await fetch(`${base}/time-tracking?previewAsPlayer=true`, { headers: { cookie: cookies.get(id)! } });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), playerTimeData);
    }
    const gmTree = await fetch(`${base}/wiki/tree`, { headers: { cookie: cookies.get(ownerId)! } });
    assert.equal(gmTree.status, 200);
    assert.match(await gmTree.text(), /Hidden landmark/);
    const playerTree = await fetch(`${base}/wiki/tree`, { headers: { cookie: cookies.get(playerId)! } });
    assert.equal(playerTree.status, 200);
    const treeText = await playerTree.text();
    assert.match(treeText, /Party landmark/);
    assert.doesNotMatch(treeText, /Hidden landmark/);
    const playerPage = await fetch(`${base}/wiki/${linkSourceId}?previewAsPlayer=true`, { headers: { cookie: cookies.get(playerId)! } });
    assert.equal(playerPage.status, 200);
    const playerPageBody = await playerPage.text();
    assert.match(playerPageBody, new RegExp(linkTargetId));
    assert.doesNotMatch(playerPageBody, new RegExp(`${secretPageId}|${privateTargetId}|${futureLinkTargetId}|Secret structured label`));
    const deniedPage = await fetch(`${base}/wiki/${secretPageId}?previewAsPlayer=true`, { headers: { cookie: cookies.get(playerId)! } });
    assert.ok([403, 404].includes(deniedPage.status));
    assert.doesNotMatch(await deniedPage.text(), /Hidden landmark/);
    for (const [path, shared, hidden] of [
      ['/wiki/quests-hub', 'Shared quest', 'Hidden quest sentinel'],
      ['/wiki/threads-hub', 'Shared thread', 'Hidden thread sentinel'],
    ]) {
      const response = await fetch(`${base}${path}?previewAsPlayer=true`, { headers: { cookie: cookies.get(playerId)! } });
      assert.equal(response.status, 200, path);
      const body = await response.text();
      assert.match(body, new RegExp(shared));
      assert.doesNotMatch(body, new RegExp(hidden));
      assert.doesNotMatch(body, /Hidden ancestor child sentinel/);
    }
    for (const path of [`/wiki/${otherPageId}`, `/wiki/quests-hub/${otherPageId}`,
      `/wiki/threads-hub/${otherPageId}`, `/wiki/adventure-hub/${otherPageId}`]) {
      const response = await fetch(`${base}${path}?previewAsPlayer=true`, { headers: { cookie: cookies.get(playerId)! } });
      assert.ok([403, 404].includes(response.status), `${path}: ${response.status}`);
      assert.doesNotMatch(await response.text(), /Cross campaign sentinel/);
    }
    const outsider = await fetch(`${base}/wiki/adventure-hub?previewAsPlayer=true`, { headers: { cookie: cookies.get(outsiderId)! } });
    assert.ok([401, 403, 404].includes(outsider.status));
    const outsiderTree = await fetch(`${base}/wiki/tree?previewAsPlayer=true`, { headers: { cookie: cookies.get(outsiderId)! } });
    assert.ok([401, 403, 404].includes(outsiderTree.status));
    const outsiderTime = await fetch(`${base}/time-tracking?previewAsPlayer=true`, { headers: { cookie: cookies.get(outsiderId)! } });
    assert.ok([401, 403, 404].includes(outsiderTime.status));
    assert.doesNotMatch(await outsiderTime.text(), /Shared calendar/);
    const anonymous = await fetch(`${base}/wiki/adventure-hub?previewAsPlayer=true`);
    assert.ok([401, 403, 404].includes(anonymous.status));
    const playerLayout = await fetch(`${base}/adventure/storyboard`, { headers: { cookie: cookies.get(playerId)! } });
    assert.equal(playerLayout.status, 403);
    await verifyCharacterAudienceHttp({ base, fixture: characterFixture, managerCookies: [ownerId, writerId].map(id => cookies.get(id)!),
      playerCookie: cookies.get(playerId)!, outsiderCookie: cookies.get(outsiderId)!, otherPageId, secretPageId });
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
    await prisma.campaign.deleteMany({ where: { id: { in: [campaignId, otherCampaignId, emptyCampaignId] } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
});
