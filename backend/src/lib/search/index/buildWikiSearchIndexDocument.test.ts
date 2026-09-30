import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMetadataFields,
  buildWikiSearchIndexDocument,
  type WikiSearchIndexPageInput,
} from './buildWikiSearchIndexDocument.js';
import { WikiVisibility } from '../../../types/domain.js';

function basePage(
  overrides: Partial<WikiSearchIndexPageInput> = {},
): WikiSearchIndexPageInput {
  return {
    id: 'page-1',
    title: 'Yuna',
    templateType: 'DEFAULT',
    metadata: {
      entityCategory: 'characters',
      profession: 'Summoner',
      knownFor: 'Aeons',
    },
    blocks: [
      {
        id: 'bio',
        type: 'text-tiptap',
        visibility: 'Party',
        content: { markdown: 'Travels with the party.' },
      },
      {
        id: 'secret',
        type: 'text-tiptap',
        visibility: 'DM_Only',
        content: { markdown: 'Secret fayth ritual.' },
      },
    ],
    visibility: WikiVisibility.PARTY,
    parentId: null,
    workspace: 'codex',
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    aliases: [{ alias: 'High Summoner' }],
    characterFields: [],
    ...overrides,
  };
}

test('buildMetadataFields elevates private org agenda only when elevated', () => {
  const meta = {
    entityCategory: 'organizations',
    motto: 'Unity',
    publicPurpose: 'Trade',
    privateAgenda: 'Conquer Spira',
  };
  const party = buildMetadataFields('ORGANIZATION', meta, false);
  const elevated = buildMetadataFields('ORGANIZATION', meta, true);
  assert.ok(party.fields.some((f) => f.text === 'Unity'));
  assert.ok(!party.fields.some((f) => f.text.includes('Conquer')));
  assert.ok(elevated.fields.some((f) => f.text.includes('Conquer')));
});

test('buildWikiSearchIndexDocument tiers DM-only body into elevatedText', () => {
  const page = basePage();
  const doc = buildWikiSearchIndexDocument(page, [page]);
  assert.equal(doc.titleNorm, 'yuna');
  assert.match(doc.aliasText, /high summoner/);
  assert.match(doc.metadataText, /summoner/);
  assert.match(doc.bodyText, /travels with the party/);
  assert.doesNotMatch(doc.bodyText, /secret fayth/);
  assert.match(doc.elevatedText, /secret fayth/);
  assert.equal(doc.typeKey, 'character');
  assert.equal(doc.sourceKind, 'wiki-page');
});

test('buildWikiSearchIndexDocument quest gmNotes go to elevatedText', () => {
  const page = basePage({
    title: "Operation Mi'ihen",
    metadata: {
      entityCategory: 'quests',
      summary: 'Stop Sin',
      gmNotes: 'Hidden Verglas tip',
    },
    blocks: [],
    aliases: [],
  });
  const doc = buildWikiSearchIndexDocument(page, [page]);
  assert.match(doc.metadataText, /stop sin/);
  assert.doesNotMatch(doc.metadataText, /verglas/);
  assert.match(doc.elevatedText, /verglas/);
});

test('buildWikiSearchIndexDocument puts hidden-tab and DM-only fields in elevatedText', () => {
  const page = basePage({
    characterFields: [
      {
        label: 'Trait',
        fieldType: 'STRING',
        value: 'party visible trait',
        capabilities: {},
        pageTab: { hidden: false, visibility: 'Party', coreKey: null },
      },
      {
        label: 'Hidden note',
        fieldType: 'STRING',
        value: 'shadowed tab secret',
        capabilities: {},
        pageTab: { hidden: true, visibility: 'Party', coreKey: null },
      },
      {
        label: 'DM field',
        fieldType: 'STRING',
        value: 'dm only field value',
        capabilities: {},
        pageTab: { hidden: false, visibility: 'DM_Only', coreKey: null },
      },
    ],
  });
  const doc = buildWikiSearchIndexDocument(page, [page]);
  assert.match(doc.customFieldText, /party visible trait/);
  assert.doesNotMatch(doc.customFieldText, /shadowed tab secret/);
  assert.doesNotMatch(doc.customFieldText, /dm only field/);
  assert.match(doc.elevatedText, /shadowed tab secret/);
  assert.match(doc.elevatedText, /dm only field/);
});
