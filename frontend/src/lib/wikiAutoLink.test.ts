import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildWikiTitleIndex,
  findNonOverlappingTitleMatches,
  isTitleBoundaryMatch,
  mapSegmentMatchesToDoc,
  normalizeScanText,
} from './wikiAutoLink.js';

describe('normalizeScanText', () => {
  it('converts non-breaking spaces to regular spaces', () => {
    assert.equal(normalizeScanText('Red\u00a0Dragon\u00a0Inn'), 'Red Dragon Inn');
  });
});

describe('isTitleBoundaryMatch', () => {
  it('allows match at string edges', () => {
    assert.equal(isTitleBoundaryMatch('Gandalf', 0, 7), true);
    assert.equal(isTitleBoundaryMatch('meet Gandalf', 5, 7), true);
  });

  it('rejects substring inside a larger token', () => {
    assert.equal(isTitleBoundaryMatch('AntiGandalf', 4, 7), false);
  });

  it('allows multi-word titles with internal spaces', () => {
    assert.equal(isTitleBoundaryMatch('at The Shire.', 3, 9), true);
  });
});

describe('buildWikiTitleIndex', () => {
  it('sorts titles longest first', () => {
    const index = buildWikiTitleIndex([
      { id: 'a', title: 'Greenest' },
      { id: 'b', title: 'Greenest Inn' },
    ]);
    assert.equal(index.titlesByLength[0], 'Greenest Inn');
    assert.equal(index.titlesByLength[1], 'Greenest');
  });

  it('includes nav title aliases from buildPageIdByTitle', () => {
    const index = buildWikiTitleIndex([
      { id: 'rc', title: 'Recent changes' },
    ]);
    assert.ok(index.byTitle.has('Recent changes'));
    assert.equal(index.byTitle.get('Recent Changes')?.pageId, 'rc');
  });
});

describe('findNonOverlappingTitleMatches', () => {
  const index = buildWikiTitleIndex([
    { id: 'inn', title: 'Red Dragon Inn' },
    { id: 'town', title: 'Greenest' },
    { id: 'the', title: 'the' },
    { id: 'snaks', title: 'Snaks Miller' },
  ]);

  const userSampleIndex = buildWikiTitleIndex([
    { id: 'inn', title: 'Red Dragon Inn' },
    { id: 'snaks', title: 'Snaks Miller' },
  ]);

  it('matches user-reported sample lines', () => {
    const line1 = 'Spends most of his evenings at the Red Dragon Inn';
    const line2 = 'Best friends with Snaks Miller';
    assert.deepEqual(
      findNonOverlappingTitleMatches(line1, userSampleIndex).map((m) => m.title),
      ['Red Dragon Inn'],
    );
    assert.deepEqual(
      findNonOverlappingTitleMatches(line2, userSampleIndex).map((m) => m.title),
      ['Snaks Miller'],
    );
  });

  it('matches "The …" wiki titles when the document omits the article', () => {
    const theInn = buildWikiTitleIndex([
      { id: 'inn', title: 'The Red Dragon Inn' },
    ]);
    assert.deepEqual(
      findNonOverlappingTitleMatches('evenings at Red Dragon Inn', theInn).map(
        (m) => m.title,
      ),
      ['The Red Dragon Inn'],
    );
  });

  it('prefers full title over partial Red and Dragon Inn pages', () => {
    const competing = buildWikiTitleIndex([
      { id: 'inn', title: 'Red Dragon Inn' },
      { id: 'di', title: 'Dragon Inn' },
      { id: 'r', title: 'Red' },
    ]);
    const line = 'Spends most of his evenings at the Red Dragon Inn';
    assert.deepEqual(
      findNonOverlappingTitleMatches(line, competing).map((m) => m.title),
      ['Red Dragon Inn'],
    );
  });

  it('prefers longer titles over overlapping shorter ones', () => {
    const matches = findNonOverlappingTitleMatches(
      'We stayed at Greenest Inn tonight.',
      index,
    );
    assert.deepEqual(
      matches.map((m) => m.title),
      ['Greenest'],
    );
  });

  it('does not link common words unless they are page titles', () => {
    const matches = findNonOverlappingTitleMatches(
      'the party traveled to Greenest',
      buildWikiTitleIndex([{ id: 'town', title: 'Greenest' }]),
    );
    assert.deepEqual(
      matches.map((m) => m.title),
      ['Greenest'],
    );
  });

  it('matches titles case-insensitively', () => {
    const matches = findNonOverlappingTitleMatches(
      'friends with snaks miller',
      buildWikiTitleIndex([{ id: 'snaks', title: 'Snaks Miller' }]),
    );
    assert.deepEqual(matches.map((m) => m.title), ['Snaks Miller']);
  });

  it('links the page title "the" when it exists in the index', () => {
    const matches = findNonOverlappingTitleMatches('see the end', index);
    assert.deepEqual(
      matches.map((m) => m.title),
      ['the'],
    );
  });

  it('selects non-overlapping matches left to right', () => {
    const multi = buildWikiTitleIndex([
      { id: 'a', title: 'Foo' },
      { id: 'b', title: 'Bar' },
    ]);
    const matches = findNonOverlappingTitleMatches('Foo and Bar met', multi);
    assert.deepEqual(
      matches.map((m) => m.title),
      ['Foo', 'Bar'],
    );
  });
});

describe('mapSegmentMatchesToDoc', () => {
  it('maps plain-text offsets through posMap', () => {
    const segment = {
      text: 'abGreenestcd',
      posMap: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    };
    const docMatches = mapSegmentMatchesToDoc(segment, [
      {
        start: 2,
        end: 10,
        title: 'Greenest',
        pageId: 'town',
      },
    ]);
    assert.deepEqual(docMatches, [{ from: 12, to: 20, pageId: 'town' }]);
  });
});
