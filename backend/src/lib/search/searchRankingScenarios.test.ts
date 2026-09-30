/**
 * Golden ranking scenarios — in-memory campaign documents.
 * Retrieval-independent: if Yuna is buried under session notes, this fails.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compareRankedResults,
  rankSearchDocument,
  type SearchDocument,
} from './searchRanking.js';
import { matchFuzzyName } from './fuzzyNameMatch.js';
import { shapeSearchResults } from './searchResultShaping.js';
import type { GlobalSearchResult } from '../../../../shared/globalSearch.js';
import { TIER } from './searchRanking.js';

interface ScenarioDoc {
  id: string;
  typeKey: string;
  label: string;
  doc: SearchDocument;
  titleNorm: string;
  aliasText: string;
}

const NOW = Date.UTC(2026, 8, 30);

function campaign(): ScenarioDoc[] {
  const notes: ScenarioDoc[] = Array.from({ length: 10 }, (_, i) => ({
    id: `sn${i}`,
    typeKey: 'session-note',
    label: 'Session Note',
    titleNorm: `session ${i}`,
    aliasText: '',
    doc: {
      title: `Session ${i}`,
      typeKey: 'session-note',
      fields: [
        {
          kind: 'body' as const,
          label: 'Body',
          text: `The party met Yuna in Besaid. Note ${i}.`,
        },
      ],
      recencyAt: new Date(NOW - i * 7 * 24 * 60 * 60 * 1000),
      inboundLinkCount: 0,
    },
  }));

  return [
    {
      id: 'yuna',
      typeKey: 'character',
      label: 'Character',
      titleNorm: 'yuna',
      aliasText: '',
      doc: { title: 'Yuna', typeKey: 'character', fields: [], inboundLinkCount: 12 },
    },
    {
      id: 'yunalesca',
      typeKey: 'character',
      label: 'Character',
      titleNorm: 'yunalesca',
      aliasText: '',
      doc: {
        title: 'Yunalesca',
        typeKey: 'character',
        fields: [],
        inboundLinkCount: 3,
      },
    },
    {
      id: 'besaid-village',
      typeKey: 'location',
      label: 'Location',
      titleNorm: 'besaid village',
      aliasText: '',
      doc: {
        title: 'Besaid Village',
        typeKey: 'location',
        fields: [],
        inboundLinkCount: 5,
      },
    },
    {
      id: 'isle-of-stars',
      typeKey: 'location',
      label: 'Location',
      titleNorm: 'isle of stars',
      aliasText: 'besaid',
      doc: {
        title: 'Isle of Stars',
        typeKey: 'location',
        fields: [{ kind: 'alias', label: 'Alias', text: 'Besaid' }],
        inboundLinkCount: 1,
      },
    },
    {
      id: 'lulu',
      typeKey: 'character',
      label: 'Character',
      titleNorm: 'lulu',
      aliasText: '',
      doc: { title: 'Lulu', typeKey: 'character', fields: [], inboundLinkCount: 4 },
    },
    {
      id: 'sn-titled-yuna',
      typeKey: 'session-note',
      label: 'Session Note',
      titleNorm: 'yuna',
      aliasText: '',
      doc: {
        title: 'Yuna',
        typeKey: 'session-note',
        fields: [{ kind: 'body', label: 'Body', text: 'A note somehow titled Yuna' }],
        inboundLinkCount: 0,
      },
    },
    // Strict exact-title distractor for the typo query "besiad"
    {
      id: 'besiad-archives',
      typeKey: 'page',
      label: 'Wiki Page',
      titleNorm: 'besiad archives',
      aliasText: '',
      doc: {
        title: 'Besiad Archives',
        typeKey: 'page',
        fields: [],
        inboundLinkCount: 0,
      },
    },
    ...notes,
  ];
}

function rankAll(query: string): GlobalSearchResult[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const docs = campaign();
  const out: GlobalSearchResult[] = [];

  for (const entry of docs) {
    let ranked = rankSearchDocument(entry.doc, tokens, query, { now: NOW });
    if (!ranked) {
      const fuzzy = matchFuzzyName(tokens, entry.titleNorm, entry.aliasText);
      if (!fuzzy) continue;
      ranked = rankSearchDocument(
        { ...entry.doc, fuzzy: { similarity: fuzzy.similarity, on: fuzzy.on } },
        tokens,
        query,
        { now: NOW },
      );
      if (!ranked) continue;
    }
    out.push({
      id: `${entry.typeKey}:${entry.id}`,
      entityId: entry.id,
      campaignId: 'c1',
      type: { key: entry.typeKey, label: entry.label },
      title: entry.doc.title,
      href: '/',
      matchedOn: ranked.matchedOn,
      score: ranked.score,
    });
  }
  out.sort(compareRankedResults);
  return out;
}

test('query "yuna": character Yuna is top-1; session note titled Yuna ties on exact tier', () => {
  const ranked = rankAll('yuna');
  assert.equal(ranked[0]!.entityId, 'yuna');
  const titledNote = ranked.find((r) => r.entityId === 'sn-titled-yuna');
  assert.ok(titledNote);
  // Exact-title neutrality: same base tier; inbound links may break the numeric tie.
  assert.ok(titledNote!.score >= TIER.exactTitle);
  assert.ok(ranked[0]!.score >= TIER.exactTitle);
  const shaped = shapeSearchResults({
    results: ranked,
    limit: 20,
    types: null,
  });
  const best = shaped.sections?.find((s) => s.kind === 'best');
  assert.ok(best);
  assert.ok(best!.resultIds.includes('character:yuna'));
  assert.ok(best!.resultIds.includes('session-note:sn-titled-yuna'));
  const mentions = shaped.sections?.find((s) => s.kind === 'mentions');
  assert.ok(mentions);
  assert.equal(mentions!.totalCount, 10);
});

test('query "besaid": Besaid Village outranks Isle of Stars alias and body mentions', () => {
  const ranked = rankAll('besaid');
  assert.equal(ranked[0]!.entityId, 'besaid-village');
  const aliasIdx = ranked.findIndex((r) => r.entityId === 'isle-of-stars');
  const bodyIdx = ranked.findIndex((r) => r.matchedOn === 'body');
  assert.ok(aliasIdx > 0);
  assert.ok(bodyIdx > aliasIdx);
});

test('query "yun": Yuna outranks Yunalesca via specificity', () => {
  const ranked = rankAll('yun');
  assert.equal(ranked[0]!.entityId, 'yuna');
  assert.ok(ranked.some((r) => r.entityId === 'yunalesca'));
  assert.ok(
    ranked.findIndex((r) => r.entityId === 'yuna') <
      ranked.findIndex((r) => r.entityId === 'yunalesca'),
  );
});

test('query "besiad": fuzzy finds Besaid Village even with strict title distractor', () => {
  const ranked = rankAll('besiad');
  // Strict: "Besiad Archives" exact/prefix title match
  // Fuzzy: Besaid Village / Isle of Stars (alias Besaid)
  assert.ok(ranked.some((r) => r.entityId === 'besiad-archives'));
  assert.ok(ranked.some((r) => r.entityId === 'besaid-village'));
  assert.ok(
    ranked.some(
      (r) =>
        r.entityId === 'besaid-village' &&
        (r.matchedOn === 'title_fuzzy' || r.matchedOn === 'title'),
    ),
  );
  // Strict distractor ranks above fuzzy, but fuzzy still surfaces after shaping
  assert.ok(
    ranked.findIndex((r) => r.entityId === 'besiad-archives') <
      ranked.findIndex((r) => r.entityId === 'besaid-village'),
  );
  const shaped = shapeSearchResults({
    results: ranked,
    limit: 20,
    types: null,
  });
  assert.ok(shaped.results.some((r) => r.entityId === 'besaid-village'));
});
