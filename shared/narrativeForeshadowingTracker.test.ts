import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveForeshadowingStage,
  detectForeshadowingIssues,
} from './narrativeForeshadowingTracker.js';
import { emptyThreadMetadata } from './threadMetadata.js';

test('deriveForeshadowingStage progresses introduced → reinforced → payoff_pending', () => {
  const introduced = {
    ...emptyThreadMetadata(),
    threadKind: 'foreshadowing' as const,
    threadStatus: 'OPEN' as const,
    introducedSessionId: 's1',
  };
  assert.equal(deriveForeshadowingStage(introduced), 'introduced');

  const reinforced = {
    ...introduced,
    lastAdvancedSessionId: 's2',
  };
  assert.equal(deriveForeshadowingStage(reinforced), 'reinforced');

  const payoffPending = {
    ...reinforced,
    payoffPageId: 'payoff-page',
  };
  assert.equal(deriveForeshadowingStage(payoffPending), 'payoff_pending');
});

test('detectForeshadowingIssues flags introduced-only thread', () => {
  const findings = detectForeshadowingIssues({
    threads: [
      {
        threadPageId: 't1',
        title: 'Omen',
        thread: {
          ...emptyThreadMetadata(),
          threadKind: 'foreshadowing',
          threadStatus: 'OPEN',
          introducedSessionId: 's1',
        },
      },
    ],
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.ruleId, 'foreshadowing_introduced_only');
});
