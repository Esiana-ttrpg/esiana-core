import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  continuityFingerprint,
  countContinuityIssues,
} from '../../../shared/continuityIssue.js';

describe('continuityFingerprint', () => {
  it('is stable for broken_link', () => {
    const a = continuityFingerprint('broken_link', {
      pageId: 'p1',
      targetPageId: 't1',
    });
    const b = continuityFingerprint('broken_link', {
      pageId: 'p1',
      targetPageId: 't1',
    });
    assert.equal(a, b);
    assert.equal(a, 'broken_link:p1:t1:');
  });

  it('uses slug when targetPageId missing', () => {
    const fp = continuityFingerprint('broken_link', {
      pageId: 'p1',
      slug: 'Kingdom Hearts',
    });
    assert.equal(fp, 'broken_link:p1::Kingdom Hearts');
  });

  it('is stable for unresolved_wikilink', () => {
    const fp = continuityFingerprint('unresolved_wikilink', {
      sourcePageId: 'src',
      normalizedText: 'sus apple',
    });
    assert.equal(fp, 'unresolved_wikilink:src:sus apple');
  });

  it('is stable for unlinked_entity', () => {
    const fp = continuityFingerprint('unlinked_entity', { pageId: 'char1' });
    assert.equal(fp, 'unlinked_entity:char1');
  });

  it('is stable for temporal_posthumous_reference', () => {
    const fp = continuityFingerprint('temporal_posthumous_reference', {
      sourcePageId: 'note-1',
      targetPageId: 'char-1',
      contentDateKey: '4050000',
      boundaryDateKey: '4020000',
    });
    assert.equal(
      fp,
      'temporal_posthumous_reference:note-1:char-1:4050000:4020000',
    );
  });
});

describe('countContinuityIssues', () => {
  it('counts by severity', () => {
    const counts = countContinuityIssues([
      {
        id: '1',
        fingerprint: '1',
        severity: 'critical',
        scope: 'local',
        type: 'broken_link',
        producer: 'link_integrity',
        message: 'x',
      },
      {
        id: '2',
        fingerprint: '2',
        severity: 'warning',
        scope: 'local',
        type: 'unlinked_entity',
        producer: 'unlinked_entity_scanner',
        message: 'y',
      },
    ]);
    assert.equal(counts.critical, 1);
    assert.equal(counts.warning, 1);
    assert.equal(counts.info, 0);
  });
});
