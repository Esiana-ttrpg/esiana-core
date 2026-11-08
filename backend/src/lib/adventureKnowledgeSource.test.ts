import assert from 'node:assert/strict';
import test from 'node:test';
import { isVisibleAdventureKnowledgeSource } from './adventureKnowledgeSource.js';

test('knowledge provenance uses source-type visibility and preserves unlinked sources', () => {
  const allowed = {
    pageIds: new Set(['visible-page']),
    eventIds: new Set(['visible-event']),
    sessionIds: new Set(['visible-session']),
  };
  const keep = (source: Parameters<typeof isVisibleAdventureKnowledgeSource>[0]) =>
    isVisibleAdventureKnowledgeSource(source, allowed);
  assert.equal(keep({ sourceEntityId: null }), true);
  assert.equal(keep({ sourceEntityType: 'WIKI_PAGE', sourceEntityId: 'visible-page' }), true);
  assert.equal(keep({ sourceEntityType: 'CALENDAR_EVENT', sourceEntityId: 'visible-event' }), true);
  assert.equal(keep({ sourceEntityType: 'CALENDAR_EVENT', sourceEntityId: 'visible-page' }), false);
  assert.equal(keep({ sourceEntityType: 'WIKI_PAGE', sourceEntityId: 'visible-event' }), false);
  assert.equal(keep({ sourceEntityType: 'SESSION_NOTE', sourceEntityId: 'visible-session' }), true);
  assert.equal(keep({ sourceEntityType: 'OTHER', sourceEntityId: 'visible-page' }), false);
  assert.equal(keep({ sourceType: 'EVENT_RECORD', sourceEntityId: 'visible-event' }), true);
});
