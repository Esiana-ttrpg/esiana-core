import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContinuityIssue } from '@shared/continuityIssue';
import {
  resolveCodexDiagnosticsChipTone,
  resolveCodexRailSectionOrder,
  resolveCodexRailVariant,
  summarizePageContinuity,
} from './pageCodexDiagnostics.ts';

function issue(
  partial: Pick<ContinuityIssue, 'severity' | 'type'>,
): ContinuityIssue {
  return {
    id: '1',
    fingerprint: 'fp',
    severity: partial.severity,
    type: partial.type,
    producer: 'link_integrity',
    scope: 'local',
    message: 'test',
  };
}

describe('summarizePageContinuity', () => {
  it('excludes unresolved_wikilink from severity buckets', () => {
    const summary = summarizePageContinuity(
      [
        issue({ severity: 'warning', type: 'broken_link' }),
        issue({ severity: 'critical', type: 'unresolved_wikilink' }),
      ],
      [],
      'page-1',
    );
    assert.equal(summary.warningCount, 1);
    assert.equal(summary.criticalCount, 0);
    assert.equal(summary.totalIssueCount, 1);
  });

  it('includes actionable unresolved rows in total and critical signal', () => {
    const summary = summarizePageContinuity(
      [],
      [
        {
          id: 'u1',
          sourcePageId: 'page-1',
          sourcePageTitle: 'Page',
          rawText: 'Missing',
          normalizedText: 'missing',
          occurrenceCount: 1,
          status: 'OPEN',
          lastSeenAt: '2020-01-01',
        },
        {
          id: 'u2',
          sourcePageId: 'other',
          sourcePageTitle: 'Other',
          rawText: 'Other',
          normalizedText: 'other',
          occurrenceCount: 1,
          status: 'OPEN',
          lastSeenAt: '2020-01-01',
        },
      ],
      'page-1',
    );
    assert.equal(summary.unresolvedCount, 1);
    assert.equal(summary.totalIssueCount, 1);
    assert.equal(summary.hasCritical, true);
    assert.equal(summary.hasAny, true);
  });
});

describe('resolveCodexRailVariant', () => {
  const cleanSummary = summarizePageContinuity([], [], 'page-1');

  it('prefers diagnostics when issues exist', () => {
    const withIssues = summarizePageContinuity(
      [issue({ severity: 'info', type: 'broken_link' })],
      [],
      'page-1',
    );
    assert.equal(
      resolveCodexRailVariant({
        isDMUser: true,
        summary: withIssues,
        discovery: { state: 'rumor', available: true },
        presenceState: 'HIDDEN',
      }),
      'diagnostics',
    );
  });

  it('returns discovery when party knowledge needs attention', () => {
    assert.equal(
      resolveCodexRailVariant({
        isDMUser: false,
        summary: cleanSummary,
        discovery: { state: 'rumor', available: true },
      }),
      'discovery',
    );
  });

  it('returns balanced when no signals', () => {
    assert.equal(
      resolveCodexRailVariant({
        isDMUser: true,
        summary: cleanSummary,
        discovery: { state: 'known', available: true },
        presenceState: 'REVEALED',
      }),
      'balanced',
    );
  });
});

describe('resolveCodexDiagnosticsChipTone', () => {
  it('maps severity bands', () => {
    assert.equal(
      resolveCodexDiagnosticsChipTone(
        summarizePageContinuity([], [], 'p'),
      ),
      'ok',
    );
    assert.equal(
      resolveCodexDiagnosticsChipTone(
        summarizePageContinuity(
          [issue({ severity: 'warning', type: 'broken_link' })],
          [],
          'p',
        ),
      ),
      'warning',
    );
  });
});

describe('resolveCodexRailSectionOrder', () => {
  it('promotes timeline for diagnostics variant', () => {
    const order = resolveCodexRailSectionOrder('diagnostics', true);
    assert.equal(order[0], 'callout');
    assert.equal(order[1], 'timeline');
  });
});
