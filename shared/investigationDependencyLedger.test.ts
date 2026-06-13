import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInvestigationDependencyLedger } from './investigationDependencyLedger.js';

test('buildInvestigationDependencyLedger links clue to scene via SCENE_CLUE', () => {
  const result = buildInvestigationDependencyLedger({
    threads: [
      {
        id: 'clue-1',
        title: 'Bloody ledger',
        threadKind: 'clue',
        narrativeWeight: 'major',
        relatedPageIds: [],
        payoffPageId: null,
        reachable: true,
        playerSubmitted: false,
      },
    ],
    scenes: [
      {
        id: 'scene-1',
        title: 'Warehouse search',
        sceneKind: 'investigation',
        participantPageIds: [],
        locationPageId: null,
        linkedCluePageIds: ['clue-1'],
        linkedThreadPageIds: [],
        outcomes: [],
        reachable: true,
      },
    ],
    titlesById: new Map([
      ['clue-1', 'Bloody ledger'],
      ['scene-1', 'Warehouse search'],
    ]),
    spofClueIds: new Set(),
    unreachableIds: new Set(),
  });

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0]!.kind, 'clue');
  const sceneCell = result.cells.find(
    (c) => c.rowId === 'clue-1' && c.columnGroup === 'scenes' && c.targetId === 'scene-1',
  );
  assert.ok(sceneCell);
  assert.equal(sceneCell!.relationKind, 'SCENE_CLUE');
  assert.equal(result.edges.length, 1);
  assert.equal(result.edges[0]!.edgeKind, 'guaranteed');
});

test('buildInvestigationDependencyLedger marks SPOF clue edges', () => {
  const result = buildInvestigationDependencyLedger({
    threads: [
      {
        id: 'clue-spof',
        title: 'Only key',
        threadKind: 'clue',
        narrativeWeight: 'critical',
        relatedPageIds: [],
        payoffPageId: null,
        reachable: false,
        playerSubmitted: false,
      },
    ],
    scenes: [
      {
        id: 'scene-1',
        title: 'Interrogation',
        sceneKind: null,
        participantPageIds: [],
        locationPageId: null,
        linkedCluePageIds: ['clue-spof'],
        linkedThreadPageIds: [],
        outcomes: [],
        reachable: false,
      },
    ],
    titlesById: new Map([
      ['clue-spof', 'Only key'],
      ['scene-1', 'Interrogation'],
    ]),
    spofClueIds: new Set(['clue-spof']),
    unreachableIds: new Set(['clue-spof']),
  });

  assert.equal(result.rows[0]!.isSpof, true);
  assert.equal(result.edges[0]!.edgeKind, 'spof_risk');
});

test('buildInvestigationDependencyLedger links lead to clue via THREAD_RELATED', () => {
  const result = buildInvestigationDependencyLedger({
    threads: [
      {
        id: 'lead-1',
        title: 'Missing heir',
        threadKind: 'mystery',
        narrativeWeight: 'major',
        relatedPageIds: ['clue-1'],
        payoffPageId: null,
        reachable: true,
        playerSubmitted: false,
      },
      {
        id: 'clue-1',
        title: 'Hidden will',
        threadKind: 'clue',
        narrativeWeight: 'major',
        relatedPageIds: [],
        payoffPageId: null,
        reachable: true,
        playerSubmitted: false,
      },
    ],
    scenes: [],
    titlesById: new Map([
      ['lead-1', 'Missing heir'],
      ['clue-1', 'Hidden will'],
    ]),
    spofClueIds: new Set(),
    unreachableIds: new Set(),
  });

  assert.equal(result.rows.length, 2);
  const leadRow = result.rows.find((r) => r.kind === 'lead');
  assert.ok(leadRow);
  const cell = result.cells.find(
    (c) => c.rowId === 'lead-1' && c.columnGroup === 'discoveries' && c.targetId === 'clue-1',
  );
  assert.ok(cell);
  assert.equal(cell!.relationKind, 'THREAD_RELATED');
});

test('buildInvestigationDependencyLedger projects location_unlock outcomes', () => {
  const result = buildInvestigationDependencyLedger({
    threads: [
      {
        id: 'clue-1',
        title: 'Map fragment',
        threadKind: 'clue',
        narrativeWeight: 'minor',
        relatedPageIds: [],
        payoffPageId: null,
        reachable: true,
        playerSubmitted: false,
      },
    ],
    scenes: [
      {
        id: 'scene-1',
        title: 'Vault breach',
        sceneKind: 'investigation',
        participantPageIds: [],
        locationPageId: null,
        linkedCluePageIds: ['clue-1'],
        linkedThreadPageIds: [],
        outcomes: [
          {
            outcomeType: 'location_unlock',
            linkedPageIds: ['loc-vault'],
          },
        ],
        reachable: true,
      },
    ],
    titlesById: new Map([
      ['clue-1', 'Map fragment'],
      ['scene-1', 'Vault breach'],
      ['loc-vault', 'Sealed vault'],
    ]),
    entityCategoryById: new Map([['loc-vault', 'locations']]),
    spofClueIds: new Set(),
    unreachableIds: new Set(),
  });

  const cell = result.cells.find(
    (c) =>
      c.rowId === 'clue-1' &&
      c.columnGroup === 'locations' &&
      c.targetId === 'loc-vault',
  );
  assert.ok(cell);
  assert.equal(cell!.derivationSource, 'outcomes[].linkedPageIds');
});

test('buildInvestigationDependencyLedger includes NPC participants for clue rows', () => {
  const result = buildInvestigationDependencyLedger({
    threads: [
      {
        id: 'clue-1',
        title: 'Witness account',
        threadKind: 'clue',
        narrativeWeight: 'major',
        relatedPageIds: [],
        payoffPageId: null,
        reachable: true,
        playerSubmitted: false,
      },
    ],
    scenes: [
      {
        id: 'scene-1',
        title: 'Tavern interview',
        sceneKind: null,
        participantPageIds: ['npc-1'],
        locationPageId: null,
        linkedCluePageIds: ['clue-1'],
        linkedThreadPageIds: [],
        outcomes: [],
        reachable: true,
      },
    ],
    titlesById: new Map([
      ['clue-1', 'Witness account'],
      ['scene-1', 'Tavern interview'],
      ['npc-1', 'Innkeeper'],
    ]),
    entityCategoryById: new Map([['npc-1', 'characters']]),
    spofClueIds: new Set(),
    unreachableIds: new Set(),
  });

  const cell = result.cells.find(
    (c) => c.rowId === 'clue-1' && c.columnGroup === 'npcs' && c.targetId === 'npc-1',
  );
  assert.ok(cell);
  assert.equal(cell!.relationKind, 'SCENE_PARTICIPANT');
});
