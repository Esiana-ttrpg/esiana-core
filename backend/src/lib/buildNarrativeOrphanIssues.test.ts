import assert from 'node:assert/strict';
import test from 'node:test';
import type { NarrativeOrphanFinding } from '../../../shared/narrativeOrphanAnalysis.js';
import { buildNarrativeOrphanIssue } from './buildNarrativeOrphanIssues.js';

test('buildNarrativeOrphanIssue maps structural isolation category', () => {
  const finding: NarrativeOrphanFinding = {
    ruleId: 'entity_graph_isolated',
    isolationClass: 'structural',
    issueType: 'narrative_orphan_entity',
    severity: 'info',
    pageId: 'page-1',
    title: 'Relic',
    messageParts: { codexType: 'OBJECT' },
  };
  const issue = buildNarrativeOrphanIssue(finding, 'global');
  assert.equal(issue.producer, 'narrative_orphan_analyzer');
  assert.equal(issue.issueCategory, 'structural');
  assert.doesNotMatch(issue.message, /orphan/i);
});
