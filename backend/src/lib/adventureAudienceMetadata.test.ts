import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptySceneMetadata } from '../../../shared/sceneMetadata.js';
import { emptyThreadMetadata } from '../../../shared/threadMetadata.js';
import { ContentRevelationStates } from '../../../shared/contentPresence.js';
import type { NarrativeViewerContext } from '../../../shared/narrativeProjection.js';
import { isEntityRelationVisible, projectEntityRelation } from '../../../shared/narrativeProjection.js';
import { restrictSceneMetadata, restrictThreadMetadata } from './adventureAudienceMetadata.js';
import { filterAdventurePreviewEvents } from './adventureAudienceEvents.js';
import { restrictStoryboardEdges } from './adventureStoryboardAudience.js';
import { EntityRelationKinds, type EntityGraphEdge } from '../../../shared/entityGraph.js';

const viewer = { role: null, perspective: 'party', capabilities: { canManageChronology: false, canRevealContent: false,
  canUseGhostMode: false, isElevatedWiki: false, isElevatedMap: false }, campaignNow: { epochMinute: 0n,
    dateParts: { year: 1, month: 1, day: 1 } } } as NarrativeViewerContext;

test('scene and thread references omit unauthorized IDs and unprojected information', () => {
  const allowed = new Set(['visible']);
  const scene = restrictSceneMetadata({ ...emptySceneMetadata(), gmNotes: 'secret notes',
    participantPageIds: ['visible', 'secret'], locationPageId: 'secret', linkedQuestPageIds: ['secret'],
    linkedObjectivePageIds: ['secret'], linkedCluePageIds: ['secret'], linkedThreadPageIds: ['secret'],
    consequencePageIds: ['secret'], followsScenePageIds: ['secret'], plannedSessionId: 'secret', playedSessionId: 'secret',
    outcomes: [{ outcomeType: 'world_state_change', description: 'secret', linkedPageIds: ['secret'] }] }, allowed);
  assert.deepEqual(scene.participantPageIds, ['visible']);
  assert.doesNotMatch(JSON.stringify(scene), /secret/);
  const thread = restrictThreadMetadata({ ...emptyThreadMetadata(), relatedPageIds: ['visible', 'secret'],
    payoffPageId: 'secret', introducedSessionId: 'secret', lastAdvancedSessionId: 'secret', resolvedSessionId: 'secret' }, allowed);
  assert.deepEqual(thread.relatedPageIds, ['visible']);
  assert.doesNotMatch(JSON.stringify(thread), /secret/);
});

test('calendar preview filters visibility and revelation before counting', () => {
  const events = [{ id: 'shared', visibility: 'PARTY' }, { id: 'private', visibility: 'DM_ONLY' },
    { id: 'hidden', visibility: 'PUBLIC' }, { id: 'draft', visibility: 'PARTY' }];
  const presence = new Map([['hidden', ContentRevelationStates.HIDDEN], ['draft', ContentRevelationStates.DRAFT]]);
  const results = filterAdventurePreviewEvents(events, visibility => visibility === 'PUBLIC' || visibility === 'PARTY', presence, viewer);
  assert.deepEqual(results.map(event => event.id), ['shared']);
  assert.deepEqual(filterAdventurePreviewEvents(events, () => true, presence, null), []);
});

test('a GM-only relationship between two visible nodes is excluded', () => {
  const relation = { id: 'secret-relation', source: { entityType: 'wiki_page', entityId: 'a' },
    target: { entityType: 'wiki_page', entityId: 'b' }, relationKind: EntityRelationKinds.SCENE_FOLLOWS,
    direction: 'directed', startDate: null, endDate: null, visibility: 'GM_ONLY', payload: null,
    sourceDomain: 'wiki_metadata', sourceRecordKey: 'secret', sourcePageId: 'a' } as EntityGraphEdge;
  const visible = isEntityRelationVisible(projectEntityRelation(relation.visibility, viewer));
  assert.equal(visible, false);
  assert.deepEqual(restrictStoryboardEdges([{ ...relation, visible }], new Set(['a', 'b'])), []);
  assert.deepEqual(restrictStoryboardEdges([{ ...relation, visibility: 'DM_ONLY', visible: true }], new Set(['a', 'b'])), []);
});
