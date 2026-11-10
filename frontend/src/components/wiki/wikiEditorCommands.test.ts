import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { filterWikiEditorCommands } from './wikiEditorCommands.js';

describe('wiki editor slash command catalog', () => {
  it('finds familiar aliases without mixing provider results', () => {
    assert.equal(filterWikiEditorCommands('checklist')[0]?.id, 'task-list');
    assert.equal(filterWikiEditorCommands('tasks')[0]?.id, 'task-list');
    assert.equal(filterWikiEditorCommands('collapsible')[0]?.id, 'details');
    assert.equal(filterWikiEditorCommands('table')[0]?.id, 'table');
    assert.equal(filterWikiEditorCommands('quote')[0]?.id, 'quote');
    assert.equal(filterWikiEditorCommands('citation')[0]?.id, 'source');
    assert.equal(filterWikiEditorCommands('source')[0]?.id, 'source');
  });

  it('contains only insertion commands, not wiki pages or campaign members', () => {
    assert.deepEqual(filterWikiEditorCommands('Moon Archive'), []);
    assert.deepEqual(filterWikiEditorCommands('Imani Vale'), []);
  });
});

