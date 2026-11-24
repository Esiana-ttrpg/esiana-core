import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCampaignActor } from '../../../shared/campaignPolicy/policy.js';
import { MembershipRoles } from '../../../shared/campaignPolicy/membershipRoles.js';
import { CampaignCapabilities } from '../../../shared/campaignPolicy/capabilities.js';
import type { NarrativeViewerContext } from '../../../shared/narrativeProjection.js';
import type { CampaignContext } from '../types/api.js';
import { filterAdventureAudiencePages, resolveAdventureAudience } from './adventureAudience.js';
import { collectVisibleQuestSubtreeRows, type QuestHubPageRow } from './questHubTree.js';

const base = { campaignOwnerUserId: 'owner', discoverability: 'private', allowPlayerChronologyManagement: false };
const gm = buildCampaignActor({ ...base, kind: 'member', userId: 'owner', membershipRole: MembershipRoles.GAMEMASTER });
const player = buildCampaignActor({ ...base, kind: 'member', userId: 'player', membershipRole: MembershipRoles.PARTICIPANT });
const viewer = { role: 'GAMEMASTER', perspective: 'elevated', capabilities: {
  canManageChronology: true, canRevealContent: true, canUseGhostMode: true, isElevatedWiki: true, isElevatedMap: true,
}, campaignNow: { epochMinute: 0n, dateParts: { year: 1, month: 1, day: 1 } } } as NarrativeViewerContext;
const context = (actor: typeof gm) => ({ actor, campaignId: 'one' }) as CampaignContext;

test('party preview retains only the actor-authorized shared baseline', () => {
  const audience = resolveAdventureAudience(context(gm), 'true', viewer);
  assert.equal(audience.preview, true);
  assert.equal(audience.canViewPage('Party'), true);
  assert.equal(audience.canViewPage('DM_Only'), false);
  assert.equal(audience.canViewPage('UPLOADER_AND_MANAGERS'), false);
  assert.equal(audience.narrativeViewer?.perspective, 'party');
  assert.equal(audience.narrativeViewer?.role, null);
  assert.ok(Object.values(audience.narrativeViewer!.capabilities).every(value => value === false));
  const caps = (audience.visibilityViewer as { capabilities: Set<string> }).capabilities;
  assert.equal(caps.has(CampaignCapabilities.NARRATIVE_ELEVATED_VIEW), false);
  assert.equal(caps.has(CampaignCapabilities.WIKI_VIEW_PARTY), true);
});

test('a manipulated parameter cannot elevate a player and ordinary context stays unchanged', () => {
  const ordinary = resolveAdventureAudience(context(player), 'true', viewer);
  assert.equal(ordinary.preview, true);
  assert.equal(ordinary.canViewPage('DM_Only'), false);
  const manager = resolveAdventureAudience(context(gm), undefined, viewer);
  assert.equal(manager.preview, false);
  assert.equal(manager.canViewPage('DM_Only'), true);
  assert.equal(manager.narrativeViewer, viewer);
});

test('party projection excludes private quests and descendants of private parents before counting', () => {
  const row = (id: string, parentId: string, visibility: string): QuestHubPageRow => ({
    id, parentId, visibility, title: id, metadata: {}, blocks: [], createdAt: new Date(0), updatedAt: new Date(0),
  });
  const rows = [row('public', 'root', 'Public'), row('party', 'root', 'Party'),
    row('secret', 'root', 'DM_Only'), row('child', 'secret', 'Party')];
  const audience = resolveAdventureAudience(context(gm), 'true', viewer);
  const visible = collectVisibleQuestSubtreeRows(rows, 'root', audience.visibilityViewer);
  assert.deepEqual(visible.map(item => item.id).sort(), ['party', 'public']);
  assert.equal(visible.length, 2);
});

test('audience pages exclude hidden ancestors, missing parents and cycles', () => {
  const rows = [
    { id: 'root', parentId: null, visibility: 'Party' },
    { id: 'visible', parentId: 'root', visibility: 'Public' },
    { id: 'hidden', parentId: 'root', visibility: 'DM_Only' },
    { id: 'child', parentId: 'hidden', visibility: 'Party' },
    { id: 'orphan', parentId: 'missing', visibility: 'Party' },
    { id: 'cycle-a', parentId: 'cycle-b', visibility: 'Party' },
    { id: 'cycle-b', parentId: 'cycle-a', visibility: 'Party' },
  ];
  const audience = resolveAdventureAudience(context(gm), 'true', viewer);
  assert.deepEqual(filterAdventureAudiencePages(rows, audience.canViewPage).map(row => row.id), ['root', 'visible']);
});
