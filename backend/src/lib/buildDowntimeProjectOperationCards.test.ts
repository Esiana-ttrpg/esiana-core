import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDowntimeProjectOperationCards } from './buildDowntimePresentation.js';
import type { DowntimeProjectDetail } from '../../../shared/projectMetadata.js';

function mockProject(overrides: Partial<DowntimeProjectDetail> = {}): DowntimeProjectDetail {
  return {
    id: 'proj-1',
    wikiPageId: 'wiki-1',
    title: 'Citadel repairs',
    href: '/campaigns/test/projects/wiki-1',
    projectType: 'construction',
    status: 'PLANNED',
    priority: 'normal',
    progressPercent: 0,
    durationTotalMinutes: '10080',
    durationElapsedMinutes: '0',
    stalledDurationMinutes: '0',
    startedAtEpochMinute: null,
    completedAtEpochMinute: null,
    ownerPageId: null,
    havenPageId: null,
    updatedAt: new Date().toISOString(),
    targetCompletionEpochMinute: null,
    relatedPageIds: [],
    resources: [],
    blockers: [],
    outcomes: [],
    risks: [],
    semanticsVersion: 'downtime-project-v1',
    createdAt: new Date().toISOString(),
    operationPosture: null,
    ...overrides,
  };
}

test('buildDowntimeProjectOperationCards labels planned projects', () => {
  const [planned] = buildDowntimeProjectOperationCards([
    { project: mockProject(), wikiMetadata: {} },
  ]);
  assert.equal(planned?.remainingLabel, 'Not yet started');
  assert.equal(planned?.clockState, 'paused');
});

test('buildDowntimeProjectOperationCards labels active running projects', () => {
  const [active] = buildDowntimeProjectOperationCards([
    {
      project: mockProject({
        status: 'ACTIVE',
        durationElapsedMinutes: '5040',
        progressPercent: 50,
      }),
      wikiMetadata: {},
    },
  ]);
  assert.equal(active?.clockState, 'running');
  assert.match(active?.remainingLabel ?? '', /remaining/i);
});
