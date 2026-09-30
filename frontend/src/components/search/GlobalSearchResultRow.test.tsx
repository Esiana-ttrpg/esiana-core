import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { GlobalSearchResultRow } from './GlobalSearchResultRow.js';
import type { GlobalSearchResult } from '@shared/globalSearch';

const baseResult: GlobalSearchResult = {
  id: 'character:1',
  entityId: '1',
  campaignId: 'c1',
  type: { key: 'character', label: 'Character' },
  title: 'Yuna',
  subtitle: 'Summoner',
  fallbackIcon: 'user',
  href: '/campaigns/demo/characters/yuna',
  matchedOn: 'title',
  score: 1000,
};

describe('GlobalSearchResultRow', () => {
  it('renders type label and fallback icon without excerpt for title matches', () => {
    const html = renderToStaticMarkup(
      <GlobalSearchResultRow
        result={baseResult}
        active={false}
        queryTokens={['yuna']}
        onSelect={() => undefined}
        onHover={() => undefined}
      />,
    );
    assert.match(html, /Character/);
    assert.match(html, /Yuna/);
    assert.match(html, /Summoner/);
    assert.doesNotMatch(html, /Biography|Body|Custom field/);
    assert.doesNotMatch(html, /<img/);
  });

  it('renders image when provided and excerpt only when present', () => {
    const html = renderToStaticMarkup(
      <GlobalSearchResultRow
        result={{
          ...baseResult,
          image: { url: '/api/assets/abc', thumbUrl: '/api/assets/abc?variant=thumb' },
          matchedOn: 'body',
          excerpt: {
            text: '…raised on the island of Besaid…',
            field: 'Body',
          },
        }}
        active
        queryTokens={['besaid']}
        onSelect={() => undefined}
        onHover={() => undefined}
      />,
    );
    assert.match(html, /<img/);
    assert.match(html, /Body/);
    assert.match(html, /Besaid/);
  });
});
