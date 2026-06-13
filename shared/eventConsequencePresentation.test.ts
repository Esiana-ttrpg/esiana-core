import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatApplyResultHeadline,
  formatConsequenceDetailLine,
  formatPreviewRows,
  shouldShowApplyCountHeadline,
} from './eventConsequencePresentation.js';
import type { EventConsequenceApplyResult } from './eventConsequence.js';

const titles = {
  'quest-1': 'Ash Cartel Recruitment',
  'loc-a': 'Blackglass Harbor',
  'loc-b': 'Greyhaven',
  'haven-1': 'Greyhaven Haven',
};

test('formatConsequenceDetailLine quest_hook discover_quest', () => {
  const line = formatConsequenceDetailLine(
    {
      id: 'ec-1',
      kind: 'quest_hook',
      payload: { mode: 'discover_quest' },
      targets: { pageIds: ['quest-1'] },
    },
    titles,
  );
  assert.match(line, /Ash Cartel Recruitment/);
  assert.match(line, /discoverable to players/);
});

test('formatConsequenceDetailLine route_change blocked', () => {
  const line = formatConsequenceDetailLine(
    {
      id: 'ec-2',
      kind: 'route_change',
      payload: { severity: 'major', reason: 'banditry' },
      targets: { locationIds: ['loc-a', 'loc-b'] },
    },
    titles,
    { projectedState: 'blocked' },
  );
  assert.match(line, /could not be projected/);
});

test('shouldShowApplyCountHeadline suppresses single complete row', () => {
  const result: EventConsequenceApplyResult = {
    previewOnly: true,
    applicationRunId: 'run-1',
    appliedCount: 1,
    partialCount: 0,
    blockedCount: 0,
    skippedCount: 0,
    consequences: [],
    pendingConfirmations: [],
    previewRows: [
      {
        consequenceId: 'ec-1',
        kind: 'quest_hook',
        projectedState: 'complete',
        summary: 'ignored',
        warnings: [],
        pendingConfirmations: [],
      },
    ],
  };
  assert.equal(shouldShowApplyCountHeadline(result), false);
  assert.equal(formatApplyResultHeadline(result), null);
});

test('shouldShowApplyCountHeadline shows for mixed outcomes', () => {
  const result: EventConsequenceApplyResult = {
    previewOnly: true,
    applicationRunId: 'run-1',
    appliedCount: 1,
    partialCount: 0,
    blockedCount: 1,
    skippedCount: 0,
    consequences: [],
    pendingConfirmations: [],
    previewRows: [
      {
        consequenceId: 'ec-1',
        kind: 'quest_hook',
        projectedState: 'complete',
        summary: 'ok',
        warnings: [],
        pendingConfirmations: [],
      },
      {
        consequenceId: 'ec-2',
        kind: 'route_change',
        projectedState: 'blocked',
        summary: 'fail',
        warnings: [],
        pendingConfirmations: [],
      },
    ],
  };
  assert.equal(shouldShowApplyCountHeadline(result), true);
  assert.equal(formatApplyResultHeadline(result), '1 change applied · 1 could not be applied');
});

test('formatPreviewRows returns narrative bullets', () => {
  const consequences = [
    {
      id: 'ec-1',
      kind: 'quest_hook' as const,
      payload: { mode: 'discover_quest' as const },
      targets: { pageIds: ['quest-1'] },
    },
  ];
  const result: EventConsequenceApplyResult = {
    previewOnly: true,
    applicationRunId: 'run-1',
    appliedCount: 1,
    partialCount: 0,
    blockedCount: 0,
    skippedCount: 0,
    consequences,
    pendingConfirmations: [],
    previewRows: [
      {
        consequenceId: 'ec-1',
        kind: 'quest_hook',
        projectedState: 'complete',
        summary: 'technical',
        warnings: [],
        pendingConfirmations: [],
      },
    ],
  };
  const lines = formatPreviewRows(result, consequences, titles);
  assert.equal(lines.length, 1);
  assert.match(lines[0]?.text ?? '', /Ash Cartel Recruitment/);
});
