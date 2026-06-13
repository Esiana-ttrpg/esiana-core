import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeNarrativeDensityMetrics,
  detectDensityThresholdIssues,
  DENSITY_THRESHOLDS,
} from './narrativeDensityMetrics.js';

test('detectDensityThresholdIssues flags high branching', () => {
  const metrics = computeNarrativeDensityMetrics({
    subjects: [],
    clueFindings: [],
    clueThreadCount: 0,
    activeFactionCount: 0,
    narrativeEntityCount: 0,
    chronologyEventCount: 0,
    questParentById: new Map(),
    questTitleById: new Map(),
    authoredThreads: [],
  });
  metrics.authored.branchingDepth.push({
    subjectPageId: 'q1',
    maxDepth: DENSITY_THRESHOLDS.maxBranchDepth + 1,
    nodeCount: 4,
    edgeCount: 3,
  });
  const findings = detectDensityThresholdIssues(metrics);
  assert.ok(findings.some((f) => f.ruleId === 'density_high_branching'));
});
