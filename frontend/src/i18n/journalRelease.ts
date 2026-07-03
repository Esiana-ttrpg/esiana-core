import type {
  ConditionDiagnostic,
  ReleaseCriteriaKind,
  ReleaseGroupOperator,
  ReleaseMissingReason,
} from '../../../shared/journalReleaseRule';
import type {
  ContentReadiness,
  JournalPublicationType,
  PerceivedPlannerState,
} from '../../../shared/journalPublication';

/**
 * Loose translate signature compatible with react-i18next's `t`. The evaluator
 * emits machine-stable snake_case token keys; we key off the diagnostic's
 * criterion kind / missing reason and map to validated camelCase i18n keys
 * (the notification-label pattern), then interpolate the evaluator's params.
 */
type TranslateFn = (key: string, params?: Record<string, unknown>) => string;

const CRITERIA_KEY: Record<ReleaseCriteriaKind, string> = {
  session_number_at_least: 'journal.criteria.sessionNumberAtLeast',
  session_completed: 'journal.criteria.sessionCompleted',
  inworld_date_after: 'journal.criteria.inworldDateAfter',
  inworld_date_before: 'journal.criteria.inworldDateBefore',
  inworld_season_is: 'journal.criteria.inworldSeasonIs',
  event_occurred: 'journal.criteria.eventOccurred',
  event_resolved: 'journal.criteria.eventResolved',
  event_visible: 'journal.criteria.eventVisible',
  event_prerequisite_met: 'journal.criteria.eventPrerequisiteMet',
  time_elapsed_since_event: 'journal.criteria.timeElapsedSinceEvent',
  world_event_accepted: 'journal.criteria.worldEventAccepted',
  character_status_is: 'journal.criteria.characterStatusIs',
  quest_lifecycle_is: 'journal.criteria.questLifecycleIs',
  page_revealed: 'journal.criteria.pageRevealed',
  page_visibility_at_least: 'journal.criteria.pageVisibilityAtLeast',
  project_status_is: 'journal.criteria.projectStatusIs',
  project_progress_at_least: 'journal.criteria.projectProgressAtLeast',
  haven_status_is: 'journal.criteria.havenStatusIs',
  haven_scale_at_least: 'journal.criteria.havenScaleAtLeast',
  faction_reputation_at_least: 'journal.criteria.factionReputationAtLeast',
  party_visited_region: 'journal.criteria.partyVisitedRegion',
  real_world_date_after: 'journal.criteria.realWorldDateAfter',
  manual_release: 'journal.criteria.manualRelease',
};

const MISSING_REASON_KEY: Record<ReleaseMissingReason, string> = {
  deleted: 'journal.diag.missingDeleted',
  restricted: 'journal.diag.missingRestricted',
  unresolved: 'journal.diag.missingUnresolved',
};

const TYPE_KEY: Record<JournalPublicationType, string> = {
  newsletter: 'journal.types.newsletter',
  letter: 'journal.types.letter',
  notice: 'journal.types.notice',
  dispatch: 'journal.types.dispatch',
  obituary: 'journal.types.obituary',
  rumor_sheet: 'journal.types.rumorSheet',
  journal_entry: 'journal.types.journalEntry',
  proclamation: 'journal.types.proclamation',
};

const PERCEIVED_STATE_KEY: Record<PerceivedPlannerState, string> = {
  needs_plan: 'journal.states.needsPlan',
  pending: 'journal.states.pending',
  blocked: 'journal.states.blocked',
};

const READINESS_KEY: Record<ContentReadiness, string> = {
  empty: 'journal.states.empty',
  partial: 'journal.states.partial',
  ready: 'journal.states.contentReady',
};

/** Render one leaf diagnostic into a plain-language sentence. */
export function renderReleaseDiagnostic(diagnostic: ConditionDiagnostic, t: TranslateFn): string {
  if (diagnostic.outcome === 'missing') {
    const reason: ReleaseMissingReason = diagnostic.missingReason ?? 'unresolved';
    const label =
      diagnostic.message.params?.label ??
      diagnostic.criteria.label ??
      t('journal.diag.defaultLabel');
    return t(MISSING_REASON_KEY[reason], { label });
  }
  return t(CRITERIA_KEY[diagnostic.criteria.kind], diagnostic.message.params ?? {});
}

export function translatePublicationType(type: JournalPublicationType, t: TranslateFn): string {
  return t(TYPE_KEY[type] ?? 'journal.types.notice');
}

export function translatePerceivedState(state: PerceivedPlannerState, t: TranslateFn): string {
  return t(PERCEIVED_STATE_KEY[state]);
}

export function translateContentReadiness(readiness: ContentReadiness, t: TranslateFn): string {
  return t(READINESS_KEY[readiness]);
}

export function translateGroupOperator(operator: ReleaseGroupOperator, t: TranslateFn): string {
  return t(operator === 'ANY' ? 'journal.diag.groupAny' : 'journal.diag.groupAll');
}
