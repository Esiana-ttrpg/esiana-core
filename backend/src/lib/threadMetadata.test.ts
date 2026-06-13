import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseThreadMetadata,
  parseThreadMetadataWithWarnings,
  publishedThreadStatusToLifecycleHint,
  publishedThreadStatusToLifecycleTarget,
} from '../../../shared/threadMetadata.js';
import { NarrativeLifecycleStates } from '../../../shared/narrativeLifecycle.js';

describe('threadMetadata', () => {
  it('parses thread metadata with version', () => {
    const parsed = parseThreadMetadata({
      threadKind: 'theory',
      threadStatus: 'OPEN',
      relatedPageIds: ['a', 'b'],
    });
    assert.equal(parsed.threadKind, 'theory');
    assert.equal(parsed.threadStatus, 'OPEN');
    assert.deepEqual(parsed.relatedPageIds, ['a', 'b']);
    assert.equal(parsed.threadMetadataVersion, 'thread-metadata-v1');
  });

  it('maps thread status to lifecycle', () => {
    assert.equal(
      publishedThreadStatusToLifecycleHint('RESOLVED'),
      NarrativeLifecycleStates.COMPLETED,
    );
    assert.equal(
      publishedThreadStatusToLifecycleHint('ABANDONED'),
      NarrativeLifecycleStates.FAILED,
    );
  });

  it('maps published status transitions', () => {
    assert.equal(
      publishedThreadStatusToLifecycleTarget(
        'OPEN',
        NarrativeLifecycleStates.LOCKED,
      ),
      NarrativeLifecycleStates.DISCOVERED,
    );
  });

  it('forces playerSubmitted for theory kind', () => {
    const parsed = parseThreadMetadata({ threadKind: 'theory' });
    assert.equal(parsed.playerSubmitted, true);
  });

  it('warns on unknown thread kind', () => {
    const { fields, warnings } = parseThreadMetadataWithWarnings({
      threadKind: 'dragon-debt',
    });
    assert.equal(fields.threadKind, 'mystery');
    assert.ok(warnings.some((w) => w.includes('Unknown thread kind')));
  });

  it('defaults narrative weight to major', () => {
    const parsed = parseThreadMetadata({});
    assert.equal(parsed.narrativeWeight, 'major');
  });

  it('normalizes critical narrative weight', () => {
    const parsed = parseThreadMetadata({ narrativeWeight: 'critical' });
    assert.equal(parsed.narrativeWeight, 'critical');
  });
});
