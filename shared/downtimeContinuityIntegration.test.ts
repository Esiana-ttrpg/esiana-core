import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ContinuityIssue } from './continuityIssue.js';
import type { DowntimeFeedCard } from './downtimeHub.js';
import type { HavenThreatEntry } from './havenMetadata.js';
import type { DowntimeProjectDetail } from './projectMetadata.js';
import {
  adaptContinuityPressureToDowntimeCards,
  applyThreatSeverityPromotion,
  buildDowntimePressurePresentation,
  buildHavenThreatFeedCards,
  buildProjectStallFeedCards,
  detectNextThreatSeverityPromotion,
  filterContinuityIssuesForDowntime,
  HAVEN_THREAT_ESCALATION_THRESHOLDS,
  MINUTES_PER_DAY,
  projectQualifiesForStallPressure,
  sortDowntimePressureFeedCards,
} from './downtimeContinuityIntegration.js';

function continuityIssue(
  overrides: Partial<ContinuityIssue> & Pick<ContinuityIssue, 'type' | 'severity'>,
): ContinuityIssue {
  return {
    id: 'issue-1',
    fingerprint: 'fp-1',
    scope: 'global',
    producer: 'narrative_foreshadowing_analyzer',
    message: 'Foreshadowing has gone stale',
    ...overrides,
  };
}

function mockProject(overrides: Partial<DowntimeProjectDetail> = {}): DowntimeProjectDetail {
  return {
    id: 'proj-1',
    wikiPageId: 'page-1',
    title: 'Temple Reconstruction',
    href: '/campaigns/test/wiki/temple',
    projectType: 'construction',
    status: 'ACTIVE',
    priority: 'normal',
    progressPercent: 40,
    durationTotalMinutes: '10080',
    durationElapsedMinutes: '5040',
    stalledDurationMinutes: '0',
    startedAtEpochMinute: '1000',
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

describe('downtimeContinuityIntegration', () => {
  it('excludes info-severity continuity diagnostics from downtime feed', () => {
    const issues = [
      continuityIssue({
        type: 'narrative_foreshadowing_stale',
        severity: 'info',
        fingerprint: 'info-1',
      }),
      continuityIssue({
        type: 'narrative_foreshadowing_stale',
        severity: 'warning',
        fingerprint: 'warn-1',
      }),
    ];

    assert.equal(filterContinuityIssuesForDowntime(issues).length, 1);
    const cards = adaptContinuityPressureToDowntimeCards(issues);
    assert.equal(cards.length, 1);
    assert.equal(cards[0]?.sourceType, 'continuity_diagnostic');
    assert.equal(cards[0]?.priority, 'ambient');
  });

  it('does not surface waiting projects without blockers', () => {
    const project = mockProject({
      stalledDurationMinutes: '0',
      blockers: [],
      resources: [{ id: 'r1', label: 'Winter', satisfied: false, amount: null, sourceKind: 'manual' }],
    });
    assert.equal(projectQualifiesForStallPressure(project), false);
    assert.equal(buildProjectStallFeedCards([project]).length, 0);
  });

  it('surfaces waiting projects with unresolved blockers', () => {
    const project = mockProject({
      stalledDurationMinutes: '0',
      blockers: [{ id: 'b1', label: 'Funding approval', resolved: false, description: null }],
    });
    assert.equal(projectQualifiesForStallPressure(project), true);
    const cards = buildProjectStallFeedCards([project]);
    assert.equal(cards.length, 1);
    assert.equal(cards[0]?.sourceType, 'project_pressure');
    assert.equal(cards[0]?.priority, 'important');
  });

  it('promotes haven threats one tier per detection pass', () => {
    const threat: HavenThreatEntry = {
      id: 't1',
      label: 'Inspection',
      severity: 'low',
      description: null,
      sinceEpochMinute: '0',
    };
    const elapsed40Days = 40n * MINUTES_PER_DAY;
    assert.equal(detectNextThreatSeverityPromotion(threat, elapsed40Days), 'rising');

    const promoted = applyThreatSeverityPromotion(threat, 'rising', elapsed40Days.toString());
    assert.equal(promoted.severity, 'rising');
    assert.equal(promoted.sinceEpochMinute, elapsed40Days.toString());
    assert.equal(detectNextThreatSeverityPromotion(promoted, elapsed40Days), null);
  });

  it('uses configured thresholds for rising to critical promotion', () => {
    const threat: HavenThreatEntry = {
      id: 't1',
      label: 'Inspection',
      severity: 'rising',
      description: null,
      sinceEpochMinute: '0',
    };
    const beforeThreshold = HAVEN_THREAT_ESCALATION_THRESHOLDS.rising - 1n;
    assert.equal(detectNextThreatSeverityPromotion(threat, beforeThreshold), null);
    assert.equal(
      detectNextThreatSeverityPromotion(threat, HAVEN_THREAT_ESCALATION_THRESHOLDS.rising),
      'critical',
    );
  });

  it('sorts feed cards by priority weight then detected epoch', () => {
    const cards: DowntimeFeedCard[] = [
      {
        id: 'drift',
        title: 'Drift',
        summary: 'Ambient',
        dateLabel: 'Drift',
        sourceType: 'creative_drift',
        priority: 'ambient',
        detectedAtEpochMinute: '500',
      },
      {
        id: 'haven',
        title: 'Critical threat',
        summary: 'Critical',
        dateLabel: 'Haven',
        sourceType: 'haven_threat',
        priority: 'critical',
        detectedAtEpochMinute: '100',
      },
      {
        id: 'project',
        title: 'Stalled project',
        summary: 'Stalled',
        dateLabel: 'Project',
        sourceType: 'project_pressure',
        priority: 'actionable',
        detectedAtEpochMinute: '200',
      },
    ];

    const sorted = sortDowntimePressureFeedCards(cards);
    assert.deepEqual(
      sorted.map((card) => card.id),
      ['haven', 'project', 'drift'],
    );
  });

  it('builds normalized pressure presentation with counts', () => {
    const presentation = buildDowntimePressurePresentation({
      continuityIssues: [
        continuityIssue({
          type: 'narrative_foreshadowing_no_payoff',
          severity: 'warning',
          fingerprint: 'warn-2',
        }),
      ],
      havens: [
        {
          id: 'haven-1',
          title: 'Hidden Cove',
          href: '/campaigns/test/wiki/cove',
          threats: [
            {
              id: 'th-1',
              label: 'Navy patrol',
              severity: 'critical',
              description: null,
              sinceEpochMinute: '100',
            },
          ],
        },
      ],
      projects: [
        mockProject({
          stalledDurationMinutes: (14n * MINUTES_PER_DAY).toString(),
        }),
      ],
    });

    assert.equal(presentation.counts.continuityPressureCount, 1);
    assert.equal(presentation.counts.havenThreatCount, 1);
    assert.equal(presentation.counts.stalledProjectCount, 1);
    assert.ok(presentation.cards.length > 0);
    assert.equal(presentation.cards[0]?.sourceType, 'haven_threat');
  });
});
