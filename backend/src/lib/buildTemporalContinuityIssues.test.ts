import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  detectTemporalContradictions,
  type TemporalContinuityIndex,
} from './buildTemporalContinuityIssues.js';

function makeIndex(
  overrides: Partial<TemporalContinuityIndex> = {},
): TemporalContinuityIndex {
  return {
    characters: new Map(),
    orgs: new Map(),
    datedLinks: [],
    ...overrides,
  };
}

describe('detectTemporalContradictions', () => {
  it('flags posthumous character reference when content date is after death', () => {
    const index = makeIndex({
      characters: new Map([
        [
          'char-1',
          {
            pageId: 'char-1',
            title: 'Aldric',
            deathDate: { year: 402, month: null, day: null },
          },
        ],
      ]),
      datedLinks: [
        {
          sourcePageId: 'note-1',
          sourceTitle: 'Session 14',
          contentDate: { year: 405, month: null, day: null },
          contentDateLabel: '405-?-?',
          targetPageId: 'char-1',
        },
      ],
    });

    const issues = detectTemporalContradictions(index);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].type, 'temporal_posthumous_reference');
    assert.equal(issues[0].producer, 'chronology_analyzer');
    assert.equal(issues[0].pageId, 'note-1');
    assert.equal(issues[0].relatedPageId, 'char-1');
  });

  it('does not flag when content date is on or before death', () => {
    const index = makeIndex({
      characters: new Map([
        [
          'char-1',
          {
            pageId: 'char-1',
            title: 'Aldric',
            deathDate: { year: 402, month: 6, day: 1 },
          },
        ],
      ]),
      datedLinks: [
        {
          sourcePageId: 'note-1',
          sourceTitle: 'Session 12',
          contentDate: { year: 402, month: 6, day: 1 },
          contentDateLabel: null,
          targetPageId: 'char-1',
        },
        {
          sourcePageId: 'note-2',
          sourceTitle: 'Session 10',
          contentDate: { year: 400, month: null, day: null },
          contentDateLabel: null,
          targetPageId: 'char-1',
        },
      ],
    });

    const issues = detectTemporalContradictions(index);
    assert.equal(issues.length, 0);
  });

  it('flags dissolved org reference when content date is after dissolution', () => {
    const index = makeIndex({
      orgs: new Map([
        [
          'org-1',
          {
            pageId: 'org-1',
            title: 'Iron Guild',
            statusEffectiveDate: { year: 300, month: null, day: null },
          },
        ],
      ]),
      datedLinks: [
        {
          sourcePageId: 'event-abc',
          sourceTitle: 'Guild summit',
          contentDate: { year: 310, month: null, day: null },
          contentDateLabel: null,
          targetPageId: 'org-1',
        },
      ],
    });

    const issues = detectTemporalContradictions(index);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].type, 'temporal_dissolved_org_reference');
    assert.equal(issues[0].relatedPageId, 'org-1');
  });

  it('skips dissolved org rule when statusEffectiveDate is missing from index', () => {
    const index = makeIndex({
      orgs: new Map(),
      datedLinks: [
        {
          sourcePageId: 'event-abc',
          sourceTitle: 'Guild summit',
          contentDate: { year: 310, month: null, day: null },
          contentDateLabel: null,
          targetPageId: 'org-1',
        },
      ],
    });

    const issues = detectTemporalContradictions(index);
    assert.equal(issues.length, 0);
  });

  it('filters issues to a specific page when filterPageId is set', () => {
    const index = makeIndex({
      characters: new Map([
        [
          'char-1',
          {
            pageId: 'char-1',
            title: 'Aldric',
            deathDate: { year: 400, month: null, day: null },
          },
        ],
      ]),
      datedLinks: [
        {
          sourcePageId: 'note-1',
          sourceTitle: 'Session 14',
          contentDate: { year: 405, month: null, day: null },
          contentDateLabel: null,
          targetPageId: 'char-1',
        },
        {
          sourcePageId: 'note-2',
          sourceTitle: 'Session 15',
          contentDate: { year: 406, month: null, day: null },
          contentDateLabel: null,
          targetPageId: 'char-1',
        },
      ],
    });

    const onCharacter = detectTemporalContradictions(index, {
      filterPageId: 'char-1',
    });
    assert.equal(onCharacter.length, 2);

    const onNote1 = detectTemporalContradictions(index, {
      filterPageId: 'note-1',
    });
    assert.equal(onNote1.length, 1);
    assert.equal(onNote1[0].pageId, 'note-1');

    const unrelated = detectTemporalContradictions(index, {
      filterPageId: 'other-page',
    });
    assert.equal(unrelated.length, 0);
  });

  it('respects maxIssues cap', () => {
    const index = makeIndex({
      characters: new Map([
        [
          'char-1',
          {
            pageId: 'char-1',
            title: 'Aldric',
            deathDate: { year: 400, month: null, day: null },
          },
        ],
      ]),
      datedLinks: [
        {
          sourcePageId: 'note-1',
          sourceTitle: 'A',
          contentDate: { year: 401, month: null, day: null },
          contentDateLabel: null,
          targetPageId: 'char-1',
        },
        {
          sourcePageId: 'note-2',
          sourceTitle: 'B',
          contentDate: { year: 402, month: null, day: null },
          contentDateLabel: null,
          targetPageId: 'char-1',
        },
      ],
    });

    const issues = detectTemporalContradictions(index, { maxIssues: 1 });
    assert.equal(issues.length, 1);
  });
});
