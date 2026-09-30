import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { GlobalSearchSections } from './GlobalSearchSections.js';
import { GlobalSearchResultRow } from './GlobalSearchResultRow.js';
import type {
  GlobalSearchResult,
  GlobalSearchSection,
} from '@shared/globalSearch';

const yuna: GlobalSearchResult = {
  id: 'character:1',
  entityId: '1',
  campaignId: 'c1',
  type: { key: 'character', label: 'Character' },
  title: 'Yuna',
  href: '/yuna',
  matchedOn: 'title',
  score: 1_040_000,
  fallbackIcon: 'user',
};

const note: GlobalSearchResult = {
  id: 'session-note:2',
  entityId: '2',
  campaignId: 'c1',
  type: { key: 'session-note', label: 'Session Note' },
  title: 'Session 12',
  href: '/s12',
  matchedOn: 'body',
  score: 100_200,
  fallbackIcon: 'notebook-pen',
  excerpt: { text: '…Yuna arrived…', field: 'Body' },
};

const fuzzy: GlobalSearchResult = {
  id: 'location:3',
  entityId: '3',
  campaignId: 'c1',
  type: { key: 'location', label: 'Location' },
  title: 'Besaid Village',
  href: '/besaid',
  matchedOn: 'title_fuzzy',
  score: 400_000,
  fallbackIcon: 'map-pin',
};

describe('GlobalSearchSections', () => {
  it('renders section headers and show-all footer', () => {
    const sections: GlobalSearchSection[] = [
      {
        kind: 'best',
        key: 'best',
        label: 'Best match',
        resultIds: ['character:1'],
        totalCount: 1,
      },
      {
        kind: 'mentions',
        key: 'mentions:session-note',
        label: 'Mentioned in 40 session notes',
        typeKey: 'session-note',
        resultIds: ['session-note:2'],
        totalCount: 40,
      },
    ];
    let jumped: string | null = null;
    const html = renderToStaticMarkup(
      <GlobalSearchSections
        sections={sections}
        results={[yuna, note]}
        activeIndex={0}
        queryTokens={['yuna']}
        queryText="yuna"
        onHover={() => undefined}
        onSelect={() => undefined}
        onShowAllType={(typeKey) => {
          jumped = typeKey;
        }}
      />,
    );
    assert.match(html, /Best match/);
    assert.match(html, /Mentioned in 40 session notes/);
    assert.match(html, /Show all 40/);
    // Simulate footer click is not possible via static markup; assert button text.
    assert.equal(jumped, null);
  });

  it('renders fuzzy similar-to hint on result rows', () => {
    const html = renderToStaticMarkup(
      <GlobalSearchResultRow
        result={fuzzy}
        active={false}
        queryTokens={['besiad']}
        queryText="besiad"
        onSelect={() => undefined}
        onHover={() => undefined}
      />,
    );
    assert.match(html, /Similar to/);
    assert.match(html, /besiad/);
  });
});
