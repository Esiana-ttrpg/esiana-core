import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { NarrativeCircularDependencyFinding } from '../../../shared/narrativeCircularDependency.js';
import { buildNarrativeCircularDependencyIssue } from './buildNarrativeCircularDependencyIssues.js';

describe('buildNarrativeCircularDependencyIssue', () => {
  it('maps unlock cycle with relatedPageIds and stable fingerprint', () => {
    const finding: NarrativeCircularDependencyFinding = {
      ruleId: 'unlock_cycle_scc',
      issueType: 'narrative_unlock_cycle',
      issueCategory: 'system_consistency',
      severity: 'critical',
      participantIds: ['quest-a', 'quest-b'],
      participantKinds: ['quest', 'quest'],
      participantLabels: { 'quest-a': 'Quest A', 'quest-b': 'Quest B' },
      messageParts: {
        participantCount: '2',
        canonicalCycleKey: 'quest-a>quest-b',
      },
    };

    const issue = buildNarrativeCircularDependencyIssue(finding, 'global');
    assert.equal(issue.producer, 'narrative_circular_dependency_analyzer');
    assert.equal(issue.type, 'narrative_unlock_cycle');
    assert.deepEqual(issue.relatedPageIds, ['quest-a', 'quest-b']);
    assert.equal(issue.fingerprint, 'narrative_unlock_cycle:unlock_cycle_scc:quest-a>quest-b');
  });

  it('maps branch cycle to subject page link', () => {
    const finding: NarrativeCircularDependencyFinding = {
      ruleId: 'branch_cycle_scc',
      issueType: 'narrative_branch_cycle',
      issueCategory: 'structural',
      severity: 'warning',
      subjectPageId: 'quest-1',
      participantIds: ['a', 'b', 'c'],
      participantLabels: { a: 'A', b: 'B', c: 'C' },
      messageParts: {
        subjectTitle: 'Main Quest',
        participantCount: '3',
        canonicalCycleKey: 'a>b>c',
      },
    };

    const issue = buildNarrativeCircularDependencyIssue(finding, 'local');
    assert.equal(issue.pageId, 'quest-1');
    assert.deepEqual(issue.relatedPageIds, ['quest-1']);
  });
});
