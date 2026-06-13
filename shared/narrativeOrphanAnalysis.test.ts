import assert from 'node:assert/strict';
import test from 'node:test';
import { EntityRelationKinds, type EntityGraphEdge } from './entityGraph.js';
import { NarrativeLifecycleStates } from './narrativeLifecycle.js';
import {
  detectNarrativeOrphans,
  isStructurallyIsolated,
  type NarrativeOrphanScanInput,
} from './narrativeOrphanAnalysis.js';
import { emptyThreadMetadata } from './threadMetadata.js';

function edge(sourceId: string, targetId: string): EntityGraphEdge {
  return {
    id: `${sourceId}-${targetId}`,
    source: { entityType: 'wiki_page', entityId: sourceId },
    target: { entityType: 'wiki_page', entityId: targetId },
    relationKind: EntityRelationKinds.WIKI_REFERENCE,
    direction: 'directed',
    startDate: null,
    endDate: null,
    visibility: null,
    payload: null,
    sourceDomain: 'wiki_link',
    sourceRecordKey: 'test',
    sourcePageId: sourceId,
  };
}

function baseInput(
  overrides: Partial<NarrativeOrphanScanInput> = {},
): NarrativeOrphanScanInput {
  return {
    pages: [],
    edges: [],
    pageIdsInThreadRelated: new Set(),
    pageIdsInQuestParticipation: new Set(),
    activeTargetPageIds: new Set(),
    calendarEventIds: new Set(),
    dissolvedOrgPageIds: new Set(),
    ...overrides,
  };
}

test('structural isolation requires all participation checks', () => {
  const page = {
    pageId: 'npc-1',
    title: 'Lonely NPC',
    codexType: 'CHARACTER',
    inboundLinkCount: 0,
    isContinuityRoot: false,
  };
  assert.equal(isStructurallyIsolated(page, baseInput()), true);
  assert.equal(
    isStructurallyIsolated(page, baseInput({ edges: [edge('other', 'npc-1')] })),
    false,
  );
});

test('detects isolated entity and unconnected thread', () => {
  const threadMeta = {
    ...emptyThreadMetadata(),
    threadKind: 'mystery' as const,
    threadStatus: 'OPEN' as const,
    relatedPageIds: [],
  };
  const findings = detectNarrativeOrphans(
    baseInput({
      pages: [
        {
          pageId: 'obj-1',
          title: 'Unused Relic',
          codexType: 'OBJECT',
          inboundLinkCount: 0,
          isContinuityRoot: false,
        },
        {
          pageId: 'thread-1',
          title: 'Open Mystery',
          codexType: 'DEFAULT',
          inboundLinkCount: 0,
          isContinuityRoot: false,
          subjectKind: 'open_thread',
          thread: threadMeta,
        },
      ],
    }),
  );
  assert.ok(findings.some((f) => f.ruleId === 'entity_graph_isolated'));
  assert.ok(findings.some((f) => f.ruleId === 'thread_unconnected'));
});

test('detects active quest isolation', () => {
  const findings = detectNarrativeOrphans(
    baseInput({
      pages: [
        {
          pageId: 'quest-1',
          title: 'Lost Quest',
          codexType: 'QUEST',
          inboundLinkCount: 0,
          isContinuityRoot: false,
          subjectKind: 'quest',
          lifecycleState: NarrativeLifecycleStates.ACTIVE,
        },
      ],
    }),
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.ruleId, 'quest_isolated');
});
