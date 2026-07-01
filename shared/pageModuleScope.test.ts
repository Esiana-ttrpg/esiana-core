import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterPagesInModuleScope,
  isSameModuleScope,
  resolvePageModuleScope,
  resolvePageSurfaceKey,
} from './pageModuleScope.ts';

const questsRoot = {
  id: 'quests-root',
  title: 'Quests',
  parentId: 'game',
  templateType: 'DEFAULT',
  metadata: { systemCategoryKey: 'quests' },
};

const threadsRoot = {
  id: 'threads-root',
  title: 'Narrative Threads',
  parentId: 'game',
  templateType: 'DEFAULT',
  metadata: { systemCategoryKey: 'narrative_threads' },
};

const charactersRoot = {
  id: 'chars-root',
  title: 'Characters',
  parentId: 'world',
  templateType: 'DEFAULT',
  metadata: { systemCategoryKey: 'party' },
};

const bestiaryRoot = {
  id: 'bestiary-root',
  title: 'Bestiary',
  parentId: 'world',
  templateType: 'DEFAULT',
  metadata: {},
};

const flatPages = [
  { id: 'world', title: 'World', parentId: null, templateType: 'DEFAULT', metadata: {} },
  { id: 'game', title: 'Game', parentId: null, templateType: 'DEFAULT', metadata: {} },
  charactersRoot,
  bestiaryRoot,
  questsRoot,
  threadsRoot,
  {
    id: 'char-1',
    title: 'Aldric',
    parentId: 'chars-root',
    templateType: 'CHARACTER',
    metadata: { entityCategory: 'characters' },
  },
  {
    id: 'beast-1',
    title: 'Owlbear',
    parentId: 'bestiary-root',
    templateType: 'DEFAULT',
    metadata: { entityCategory: 'bestiary' },
  },
  {
    id: 'quest-1',
    title: 'Rescue the Duke',
    parentId: 'quests-root',
    templateType: 'QUEST',
    metadata: { questStatus: 'AVAILABLE' },
  },
  {
    id: 'thread-1',
    title: 'Who poisoned the king?',
    parentId: 'threads-root',
    templateType: 'DEFAULT',
    metadata: {
      threadMetadataVersion: 'thread-metadata-v1',
      threadKind: 'mystery',
      threadStatus: 'OPEN',
    },
  },
];

describe('resolvePageSurfaceKey', () => {
  it('detects character, bestiary, quest, and thread surfaces', () => {
    assert.equal(resolvePageSurfaceKey(flatPages[6], flatPages), 'character');
    assert.equal(resolvePageSurfaceKey(flatPages[7], flatPages), 'bestiary');
    assert.equal(resolvePageSurfaceKey(flatPages[8], flatPages), 'quest');
    assert.equal(resolvePageSurfaceKey(flatPages[9], flatPages), 'thread');
  });

  it('detects event lore pages by id', () => {
    assert.equal(
      resolvePageSurfaceKey(
        {
          id: 'event-cal-1',
          title: 'The Fall',
          parentId: null,
          templateType: 'DEFAULT',
          metadata: {},
        },
        flatPages,
      ),
      'event-lore',
    );
  });
});

describe('resolvePageModuleScope', () => {
  it('scopes character pages to characters module', () => {
    const scope = resolvePageModuleScope(flatPages[6], flatPages);
    assert.equal(scope.moduleKey, 'characters');
    assert.equal(scope.anchorPageId, 'chars-root');
    assert.equal(scope.surfaceKey, 'character');
  });

  it('scopes quest pages to quests module', () => {
    const scope = resolvePageModuleScope(flatPages[8], flatPages);
    assert.equal(scope.moduleKey, 'quests');
    assert.equal(scope.anchorPageId, 'quests-root');
  });
});

describe('filterPagesInModuleScope', () => {
  it('excludes cross-module parents', () => {
    const scope = resolvePageModuleScope(flatPages[6], flatPages);
    const eligible = filterPagesInModuleScope(flatPages, scope, 'char-1');
    const ids = eligible.map((page) => page.id);
    assert.ok(ids.includes('chars-root'));
    assert.ok(!ids.includes('bestiary-root'));
    assert.ok(!ids.includes('char-1'));
  });

  it('compares module scopes', () => {
    const a = resolvePageModuleScope(flatPages[6], flatPages);
    const b = resolvePageModuleScope(flatPages[7], flatPages);
    assert.equal(isSameModuleScope(a, a), true);
    assert.equal(isSameModuleScope(a, b), false);
  });
});
