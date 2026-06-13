import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NarrativeLifecycleStates } from './narrativeLifecycle.js';
import {
  allowedThreadStatusesForLifecycle,
  coerceThreadStatusForLifecycle,
  isThreadStatusAllowedForLifecycle,
  lifecycleTargetForThreadStatusPatch,
} from './threadLifecycleMatrix.js';

describe('threadLifecycleMatrix', () => {
  it('allows OPEN and DORMANT for DISCOVERED', () => {
    const allowed = allowedThreadStatusesForLifecycle(NarrativeLifecycleStates.DISCOVERED);
    assert.deepEqual(allowed, ['OPEN', 'DORMANT']);
  });

  it('allows only OPEN for ACTIVE', () => {
    assert.ok(isThreadStatusAllowedForLifecycle('OPEN', NarrativeLifecycleStates.ACTIVE));
    assert.ok(!isThreadStatusAllowedForLifecycle('DORMANT', NarrativeLifecycleStates.ACTIVE));
  });

  it('coerces DORMANT to OPEN when lifecycle is ACTIVE', () => {
    assert.equal(
      coerceThreadStatusForLifecycle('DORMANT', NarrativeLifecycleStates.ACTIVE),
      'OPEN',
    );
  });

  it('maps RESOLVED to COMPLETED lifecycle target', () => {
    assert.equal(
      lifecycleTargetForThreadStatusPatch(
        'RESOLVED',
        NarrativeLifecycleStates.ACTIVE,
      ),
      NarrativeLifecycleStates.COMPLETED,
    );
  });

  it('rejects DORMANT patch while ACTIVE', () => {
    assert.equal(
      lifecycleTargetForThreadStatusPatch(
        'DORMANT',
        NarrativeLifecycleStates.ACTIVE,
      ),
      null,
    );
  });
});
