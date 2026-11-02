import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getWritingSource,
  listWritingSources,
} from './sourceRegistry.js';
import {
  originFromProvenance,
  reconstructedWordChange,
  shouldRecordWritingContribution,
} from './recordWritingContribution.js';
import { writingSessionRollupFields } from './aggregateWritingWords.js';

describe('writing source registry', () => {
  it('registers wiki, workshop, session notes, and later independent fields', () => {
    const ids = listWritingSources().map((source) => source.id);
    assert.ok(ids.includes('wiki.page'));
    assert.ok(ids.includes('workshop.apply'));
    assert.ok(ids.includes('workshop.formalize'));
    assert.ok(ids.includes('session_note'));
    assert.equal(getWritingSource('character.tab').implemented, false);
    assert.equal(getWritingSource('journal.publication').implemented, false);
    assert.equal(getWritingSource('wiki.page').saveBoundary, 'explicit_save');
    assert.equal(getWritingSource('workshop.apply').saveBoundary, 'apply');
  });

  it('records human wiki saves and skips import, restore, seed, and autosave', () => {
    assert.equal(
      shouldRecordWritingContribution({
        actorUserId: 'user-1',
        narrativeSource: 'user',
      }),
      true,
    );
    assert.equal(
      shouldRecordWritingContribution({
        actorUserId: 'user-1',
        emitEvents: false,
      }),
      false,
    );
    for (const source of ['import', 'restore', 'seed', 'migration', 'repair']) {
      assert.equal(
        shouldRecordWritingContribution({
          actorUserId: 'user-1',
          narrativeSource: source,
        }),
        false,
      );
    }
    assert.equal(
      shouldRecordWritingContribution({
        actorUserId: 'user-1',
        skipWritingContribution: true,
      }),
      false,
    );
    assert.equal(originFromProvenance('user'), 'human');
    assert.equal(originFromProvenance('import'), 'import');
  });

  it('reconstructs net-only rows without inventing added versus removed', () => {
    assert.deepEqual(reconstructedWordChange(12), {
      wordsAdded: 12,
      wordsRemoved: 0,
      netChange: 12,
      availability: 'reconstructed',
    });
    assert.deepEqual(reconstructedWordChange(-9), {
      wordsAdded: 0,
      wordsRemoved: 9,
      netChange: -9,
      availability: 'reconstructed',
    });
  });

  it('keeps writing-session rollup increments free of client wordDelta', () => {
    const fields = writingSessionRollupFields({
      durationMs: 120_000,
      linksAdded: 1,
      at: new Date('2026-06-15T18:00:00.000Z'),
    });
    assert.equal('wordsAdded' in fields, false);
    assert.equal('wordsRemoved' in fields, false);
    assert.equal(fields.sessionCount, 1);
    assert.equal(fields.sessionMinutes, 2);
    assert.equal(fields.linksCreated, 1);
  });
});
