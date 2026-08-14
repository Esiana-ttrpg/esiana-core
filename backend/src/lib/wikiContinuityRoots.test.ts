import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  classifyContinuityRole,
  getContinuityRootTitles,
  isContinuityRoot,
  isEligibleForUnlinkedEntityIssue,
  isNarrativeEntity,
} from './wikiContinuityRoots.js';

describe('wikiContinuityRoots', () => {
  it('treats skeleton titles as roots', () => {
    assert.equal(
      isContinuityRoot({ id: '1', title: 'Quick Access', templateType: 'DEFAULT' }),
      true,
    );
    assert.equal(
      isContinuityRoot({ id: '2', title: 'Characters', templateType: 'DEFAULT' }),
      true,
    );
    assert.equal(
      isContinuityRoot({ id: '3', title: 'Settings', templateType: 'DEFAULT' }),
      true,
    );
  });

  it('includes category index titles in root set', () => {
    const roots = getContinuityRootTitles();
    assert.ok(roots.has('Quests'));
    assert.ok(roots.has('Maps'));
  });

  it('classifies character entity as narrative', () => {
    const page = {
      id: 'c1',
      title: 'Johnny Nior',
      templateType: 'DEFAULT',
      metadata: { entityCategory: 'characters' },
    };
    assert.equal(isNarrativeEntity(page), true);
    assert.equal(classifyContinuityRole(page), 'narrative');
  });

  it('eligible for unlinked when narrative and zero inbound', () => {
    const page = {
      id: 'c1',
      title: 'Johnny Nior',
      templateType: 'DEFAULT',
      metadata: { entityCategory: 'characters' },
    };
    assert.equal(
      isEligibleForUnlinkedEntityIssue(page, 0),
      true,
    );
    assert.equal(
      isEligibleForUnlinkedEntityIssue(page, 1),
      false,
    );
  });

  it('World is not eligible for unlinked', () => {
    const page = {
      id: 'w1',
      title: 'World',
      templateType: 'DEFAULT',
    };
    assert.equal(
      isEligibleForUnlinkedEntityIssue(page, 0),
      false,
    );
  });
});
