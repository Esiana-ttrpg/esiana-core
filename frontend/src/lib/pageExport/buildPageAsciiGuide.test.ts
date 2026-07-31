import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pickAsciiTagline } from './asciiTaglines.js';
import { buildPageAsciiGuide } from './buildPageAsciiGuide.js';
import type { PageExportContext } from './types.js';

function baseContext(overrides: Partial<PageExportContext> = {}): PageExportContext {
  return {
    page: {
      id: 'page-1',
      title: 'Test Character',
      pathKey: 'test-character',
      templateType: 'CHARACTER',
      visibility: 'Party',
      tagNames: ['ally', 'wizard'],
    },
    campaign: { handle: 'demo', name: 'Demo Campaign' },
    blocks: [
      {
        id: 'b1',
        type: 'text-tiptap',
        x: 0,
        y: 0,
        w: 12,
        h: 4,
        content: { markdown: '# Lore\n\nHello **world**.' },
        isPrivate: false,
      },
    ],
    printableElement: null,
    ...overrides,
  };
}

describe('buildPageAsciiGuide', () => {
  it('uses GameFAQs-style sections and flattened body (not YAML front matter)', () => {
    const guide = buildPageAsciiGuide(baseContext());

    assert.doesNotMatch(guide, /^---\n/);
    assert.match(guide, /^={78}\n/);
    assert.match(guide, /TYPE:\s+CHARACTER/);
    assert.match(guide, /VISIBILITY:\s+Party/);
    assert.match(guide, /CAMPAIGN:\s+Demo Campaign/);
    assert.match(guide, /PATH:\s+test-character/);
    assert.match(guide, /TAGS/);
    assert.match(guide, /- ally/);
    assert.match(guide, /BODY/);
    assert.match(guide, /LORE/);
    assert.match(guide, /Hello world\./);
    assert.match(guide, /END OF ARCHIVE/);
    assert.match(guide, /EOF/);
  });

  it('picks the same tagline for the same page id', () => {
    const first = buildPageAsciiGuide(baseContext());
    const second = buildPageAsciiGuide(baseContext());
    const tagline = pickAsciiTagline('page-1');
    assert.match(first, new RegExp(tagline.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal(
      first.split('END OF ARCHIVE')[1],
      second.split('END OF ARCHIVE')[1],
    );
  });

  it('includes share URL only when provided on campaign context', () => {
    const withoutUrl = buildPageAsciiGuide(baseContext());
    assert.doesNotMatch(withoutUrl, /https?:\/\//);

    const withUrl = buildPageAsciiGuide(
      baseContext({
        campaign: {
          handle: 'demo',
          name: 'Demo Campaign',
          discoverability: 'public',
          shareUrl: 'https://app.example.com/campaigns/demo',
        },
      }),
    );
    assert.match(withUrl, /https:\/\/app\.example\.com\/campaigns\/demo/);
  });

  it('renders breadcrumb and infobox sections when present', () => {
    const guide = buildPageAsciiGuide(
      baseContext({
        extras: { breadcrumbTitles: ['World', 'People', 'Mira'] },
        blocks: [
          {
            id: 'infobox',
            type: 'wiki-infobox',
            x: 0,
            y: 0,
            w: 3,
            h: 2,
            content: { fields: [{ key: 'Homeland', value: 'North' }] },
            isPrivate: false,
          },
          {
            id: 'b1',
            type: 'text-tiptap',
            x: 0,
            y: 2,
            w: 12,
            h: 4,
            content: { markdown: 'Body text.' },
            isPrivate: false,
          },
        ],
      }),
    );

    assert.match(guide, /LOCATION IN WIKI/);
    assert.match(guide, /World > People > Mira/);
    assert.match(guide, /DETAILS/);
    assert.match(guide, /HOMELAND: North/);
  });

  it('falls back to plain uppercase title when banner cannot render', () => {
    const guide = buildPageAsciiGuide(
      baseContext({
        page: {
          id: 'page-2',
          title: 'Mira & Co.',
          pathKey: 'mira',
          templateType: 'CHARACTER',
          visibility: 'Party',
          tagNames: [],
        },
      }),
    );

    assert.match(guide, /MIRA & CO\./);
  });
});
