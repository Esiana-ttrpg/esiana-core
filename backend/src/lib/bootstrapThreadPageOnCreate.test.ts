import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NarrativeLifecycleStates } from '../../../shared/narrativeLifecycle.js';
import {
  bootstrapThreadPageOnCreate,
  isExplicitThreadCreate,
} from './bootstrapThreadPageOnCreate.js';

describe('bootstrapThreadPageOnCreate', () => {
  it('requires threadKind', () => {
    const result = bootstrapThreadPageOnCreate({ metadata: {} });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 400);
  });

  it('rejects invalid threadKind', () => {
    const result = bootstrapThreadPageOnCreate({
      metadata: { threadKind: 'omen' },
    });
    assert.equal(result.ok, false);
  });

  it('merges promise with critical weight and discovered lifecycle', () => {
    const result = bootstrapThreadPageOnCreate({
      metadata: {
        threadKind: 'promise',
        narrativeWeight: 'critical',
        threadStatus: 'OPEN',
      },
      initialThreadLifecycle: NarrativeLifecycleStates.DISCOVERED,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.metadata.threadKind, 'promise');
      assert.equal(result.metadata.narrativeWeight, 'critical');
      assert.equal(result.initialLifecycle, NarrativeLifecycleStates.DISCOVERED);
      assert.ok(
        (result.blocks as { type?: string }[]).some(
          (b) => b.type === 'entity-thread-properties',
        ),
      );
    }
  });

  it('forces playerSubmitted for theory', () => {
    const result = bootstrapThreadPageOnCreate({
      metadata: { threadKind: 'theory' },
      initialThreadLifecycle: NarrativeLifecycleStates.LOCKED,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.metadata.playerSubmitted, true);
    }
  });
});

describe('isExplicitThreadCreate', () => {
  it('detects threadKind in metadata', () => {
    assert.ok(isExplicitThreadCreate({ threadKind: 'clue' }));
    assert.ok(!isExplicitThreadCreate({ entityCategory: 'foo' }));
  });
});
