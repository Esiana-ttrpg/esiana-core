/**
 * Journal release-rule DSL + pure evaluator (browser-safe, shared FE/BE).
 *
 * A ReleaseNode tree is a rendered query plan, never a localized sentence:
 * localization happens only at (a) each leaf condition and (b) the two group
 * labels ("All of" / "Any of"). Every criterion is owned by exactly one
 * truth-source subsystem; the backend snapshot builder has one resolver per
 * subsystem, and this evaluator only reads already-resolved facts.
 *
 * @see docs/plans/journal-system.md
 */
import { HAVEN_SCALES } from './havenMetadata.js';

export const JOURNAL_RELEASE_RULE_SEMANTICS_VERSION = 'journal-release-rule-v1';

export type ReleaseGroupOperator = 'ALL' | 'ANY';

/** Owning truth-source subsystem for every criterion kind. */
export type CriteriaSubsystem =
  | 'chronology' // campaign clock, calendar/season, sessions, events-in-time
  | 'narrative' // character status, quest lifecycle
  | 'discovery' // reveal engine + page ACL visibility
  | 'downtime' // projects & havens
  | 'reputation' // party<->faction + region visits
  | 'publishing' // external schedule (real-world clock)
  | 'manual'; // explicit GM action

/** Optional authoring-time display snapshot; used ONLY as a diagnostics fallback (e.g. when the entity is later deleted), never as evaluation truth. */
type WithLabel = { label?: string };

export type ReleaseCriteria =
  // chronology (temporal)
  | ({ kind: 'session_number_at_least'; value: number; operator?: ComparisonOperator } & WithLabel)
  | ({ kind: 'session_completed'; sessionPageId: string } & WithLabel)
  | ({ kind: 'inworld_date_after'; epochMinute: string } & WithLabel)
  | ({ kind: 'inworld_date_before'; epochMinute: string } & WithLabel)
  | ({ kind: 'inworld_season_is'; seasonId: string } & WithLabel)
  | ({ kind: 'event_occurred'; eventId: string } & WithLabel)
  | ({ kind: 'event_resolved'; eventId: string } & WithLabel)
  | ({ kind: 'event_visible'; eventId: string } & WithLabel)
  | ({ kind: 'event_prerequisite_met'; eventId: string } & WithLabel)
  | ({ kind: 'time_elapsed_since_event'; eventId: string; minutes: string } & WithLabel)
  | ({ kind: 'world_event_accepted'; suggestionId: string } & WithLabel)
  // narrative (state)
  | ({ kind: 'character_status_is'; pageId: string; status: string } & WithLabel)
  | ({ kind: 'quest_lifecycle_is'; pageId: string; state: string } & WithLabel)
  // discovery / visibility (reveal engine + page ACL)
  | ({ kind: 'page_revealed'; pageId: string } & WithLabel)
  | ({ kind: 'page_visibility_at_least'; pageId: string; level: PageVisibilityLevel } & WithLabel)
  // downtime (projects & havens — wiki-page linked)
  | ({ kind: 'project_status_is'; pageId: string; status: string } & WithLabel)
  | ({ kind: 'project_progress_at_least'; pageId: string; percent: number } & WithLabel)
  | ({ kind: 'haven_status_is'; pageId: string; status: string } & WithLabel)
  | ({ kind: 'haven_scale_at_least'; pageId: string; scale: string } & WithLabel)
  // reputation / party
  | ({ kind: 'faction_reputation_at_least'; factionPageId: string; axis: ReputationCriteriaAxis; value: number } & WithLabel)
  | ({ kind: 'party_visited_region'; locationPageId: string } & WithLabel)
  // publishing (external schedule — wall clock; poll/evaluate path only)
  | ({ kind: 'real_world_date_after'; isoDate: string; operator?: ComparisonOperator } & WithLabel)
  // manual
  | ({ kind: 'manual_release' } & WithLabel);
  

export type ReleaseCriteriaKind = ReleaseCriteria['kind'];

export type ReputationCriteriaAxis = 'trust' | 'notoriety';

/** ACL ladder DM_Only < Party < Public. */
export type PageVisibilityLevel = 'dm' | 'party' | 'public';

export interface ReleaseNode {
  type: 'group' | 'criteria';
  operator?: ReleaseGroupOperator;
  children?: ReleaseNode[];
  criteria?: ReleaseCriteria;
}

/** Static kind -> owning subsystem registry. Also the extension seam: a future plugin capability would register a new leaf against an existing subsystem here rather than editing a switch. */
const CRITERIA_SUBSYSTEM: Record<ReleaseCriteriaKind, CriteriaSubsystem> = {
  session_number_at_least: 'chronology',
  session_completed: 'chronology',
  inworld_date_after: 'chronology',
  inworld_date_before: 'chronology',
  inworld_season_is: 'chronology',
  event_occurred: 'chronology',
  event_resolved: 'chronology',
  event_visible: 'chronology',
  event_prerequisite_met: 'chronology',
  time_elapsed_since_event: 'chronology',
  world_event_accepted: 'chronology',
  character_status_is: 'narrative',
  quest_lifecycle_is: 'narrative',
  page_revealed: 'discovery',
  page_visibility_at_least: 'discovery',
  project_status_is: 'downtime',
  project_progress_at_least: 'downtime',
  haven_status_is: 'downtime',
  haven_scale_at_least: 'downtime',
  faction_reputation_at_least: 'reputation',
  party_visited_region: 'reputation',
  real_world_date_after: 'publishing',
  manual_release: 'manual',
};

export function criteriaSubsystem(kind: ReleaseCriteriaKind): CriteriaSubsystem {
  return CRITERIA_SUBSYSTEM[kind];
}

export type PlanState = 'needs_plan' | 'pending' | 'blocked' | 'ready';
export type ConditionOutcome = 'met' | 'unmet' | 'missing';
export type ReleaseMissingReason = 'deleted' | 'restricted' | 'unresolved';

/** i18n-friendly leaf token: `{ key, params }` rendered via `t(key, params)`. */
export interface I18nToken {
  key: string;
  params?: Record<string, string | number>;
}

/**
 * One leaf diagnostic. `path` is the index trail into the tree so the UI can
 * render the translated leaf under its group. `missingReason` distinguishes a
 * deleted entity from one the viewer just can't see, so a message never leaks a
 * raw UUID.
 */
export interface ConditionDiagnostic {
  path: number[];
  criteria: ReleaseCriteria;
  outcome: ConditionOutcome;
  missingReason?: ReleaseMissingReason;
  message: I18nToken;
}

/** A resolved fact from a subsystem, or a flagged-missing reference. */
export type SnapshotFact<T> =
  | { status: 'ok'; value: T; label?: string }
  | { status: 'missing'; missingReason: ReleaseMissingReason; label?: string };

export interface JournalEventFact {
  occurred: boolean;
  resolved: boolean;
  visible: boolean;
  prerequisiteMet: boolean;
  targetEpochMinute: string | null;
}

/**
 * Facts gathered by the campaign-scoped snapshot builder. Reference-keyed maps
 * are populated only for entities actually referenced by the rules being
 * evaluated (reference-driven, never full-table scans).
 */
export interface JournalReleaseSnapshot {
  currentEpochMinute: string; // BigInt serialized as string
  currentSession: number;
  currentSeasonId: string | null;
  nowIso: string; // server wall clock (publishing subsystem)

  sessions: Record<string, SnapshotFact<{ completed: boolean }>>;
  events: Record<string, SnapshotFact<JournalEventFact>>;
  worldEventSuggestions: Record<string, SnapshotFact<{ accepted: boolean }>>;
  characters: Record<string, SnapshotFact<{ status: string | null }>>;
  quests: Record<string, SnapshotFact<{ lifecycleState: string | null }>>;
  pages: Record<string, SnapshotFact<{ revealed: boolean; visibilityLevel: PageVisibilityLevel }>>;
  projects: Record<string, SnapshotFact<{ status: string | null; progressPercent: number }>>;
  havens: Record<string, SnapshotFact<{ status: string | null; scale: string | null }>>;
  factions: Record<string, SnapshotFact<{ trust: number; notoriety: number }>>;
  regions: Record<string, SnapshotFact<{ visited: boolean }>>;
}

const VISIBILITY_LADDER: readonly PageVisibilityLevel[] = ['dm', 'party', 'public'];

function toBigInt(value: string | null | undefined): bigint | null {
  if (value === null || value === undefined || value === '') return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function eqIgnoreCase(a: string | null | undefined, b: string): boolean {
  return typeof a === 'string' && a.trim().toUpperCase() === b.trim().toUpperCase();
}

function missingDiagnostic(
  path: number[],
  criteria: ReleaseCriteria,
  fact: { status: 'missing'; missingReason: ReleaseMissingReason; label?: string } | undefined,
): ConditionDiagnostic {
  const reason: ReleaseMissingReason = fact ? fact.missingReason : 'unresolved';
  const label = fact?.label ?? criteria.label;
  return {
    path,
    criteria,
    outcome: 'missing',
    missingReason: reason,
    message: { key: `journal.diag.missing_${reason}`, params: label ? { label } : {} },
  };
}

function conditionDiagnostic(
  path: number[],
  criteria: ReleaseCriteria,
  met: boolean,
  params: Record<string, string | number>,
): ConditionDiagnostic {
  return {
    path,
    criteria,
    outcome: met ? 'met' : 'unmet',
    message: { key: `journal.criteria.${criteria.kind}`, params },
  };
}

function resolvedLabel<T>(fact: SnapshotFact<T>, criteria: ReleaseCriteria): string | undefined {
  return (fact.status === 'ok' ? fact.label : undefined) ?? criteria.label;
}

/** Evaluate a single criterion leaf against the snapshot into a diagnostic. */
function evaluateLeaf(
  criteria: ReleaseCriteria,
  snapshot: JournalReleaseSnapshot,
  path: number[],
): ConditionDiagnostic {
  switch (criteria.kind) {
    case 'session_number_at_least':
      {
        const op = (criteria as any).operator ?? '>=';
        const left = snapshot.currentSession;
        const right = criteria.value;
        let met = false;
        switch (op) {
          case '=':
            met = left === right;
            break;
          case '!=':
            met = left !== right;
            break;
          case '>':
            met = left > right;
            break;
          case '<':
            met = left < right;
            break;
          case '>=':
            met = left >= right;
            break;
          case '<=':
            met = left <= right;
            break;
          default:
            met = left >= right;
        }
        return conditionDiagnostic(path, criteria, met, { n: criteria.value });
      }

    case 'session_completed': {
      const fact = snapshot.sessions[criteria.sessionPageId];
      if (!fact || fact.status === 'missing') return missingDiagnostic(path, criteria, fact);
      return conditionDiagnostic(path, criteria, fact.value.completed, {
        label: resolvedLabel(fact, criteria) ?? '',
      });
    }

    case 'inworld_date_after': {
      const now = toBigInt(snapshot.currentEpochMinute);
      const target = toBigInt(criteria.epochMinute);
      const met = now !== null && target !== null && now >= target;
      return conditionDiagnostic(path, criteria, met, { date: criteria.label ?? '' });
    }

    case 'inworld_date_before': {
      const now = toBigInt(snapshot.currentEpochMinute);
      const target = toBigInt(criteria.epochMinute);
      const met = now !== null && target !== null && now < target;
      return conditionDiagnostic(path, criteria, met, { date: criteria.label ?? '' });
    }

    case 'inworld_season_is':
      return conditionDiagnostic(path, criteria, snapshot.currentSeasonId === criteria.seasonId, {
        season: criteria.label ?? criteria.seasonId,
      });

    case 'event_occurred':
    case 'event_resolved':
    case 'event_visible':
    case 'event_prerequisite_met': {
      const fact = snapshot.events[criteria.eventId];
      if (!fact || fact.status === 'missing') return missingDiagnostic(path, criteria, fact);
      const flag =
        criteria.kind === 'event_occurred'
          ? fact.value.occurred
          : criteria.kind === 'event_resolved'
            ? fact.value.resolved
            : criteria.kind === 'event_visible'
              ? fact.value.visible
              : fact.value.prerequisiteMet;
      return conditionDiagnostic(path, criteria, flag, { label: resolvedLabel(fact, criteria) ?? '' });
    }

    case 'time_elapsed_since_event': {
      const fact = snapshot.events[criteria.eventId];
      if (!fact || fact.status === 'missing') return missingDiagnostic(path, criteria, fact);
      const now = toBigInt(snapshot.currentEpochMinute);
      const target = toBigInt(fact.value.targetEpochMinute);
      const elapsed = toBigInt(criteria.minutes);
      const met =
        now !== null && target !== null && elapsed !== null && now - target >= elapsed;
      return conditionDiagnostic(path, criteria, met, {
        label: resolvedLabel(fact, criteria) ?? '',
        minutes: criteria.minutes,
      });
    }

    case 'world_event_accepted': {
      const fact = snapshot.worldEventSuggestions[criteria.suggestionId];
      if (!fact || fact.status === 'missing') return missingDiagnostic(path, criteria, fact);
      return conditionDiagnostic(path, criteria, fact.value.accepted, {
        label: resolvedLabel(fact, criteria) ?? '',
      });
    }

    case 'character_status_is': {
      const fact = snapshot.characters[criteria.pageId];
      if (!fact || fact.status === 'missing') return missingDiagnostic(path, criteria, fact);
      return conditionDiagnostic(path, criteria, eqIgnoreCase(fact.value.status, criteria.status), {
        label: resolvedLabel(fact, criteria) ?? '',
        status: criteria.status,
      });
    }

    case 'quest_lifecycle_is': {
      const fact = snapshot.quests[criteria.pageId];
      if (!fact || fact.status === 'missing') return missingDiagnostic(path, criteria, fact);
      return conditionDiagnostic(
        path,
        criteria,
        eqIgnoreCase(fact.value.lifecycleState, criteria.state),
        { label: resolvedLabel(fact, criteria) ?? '', state: criteria.state },
      );
    }

    case 'page_revealed': {
      const fact = snapshot.pages[criteria.pageId];
      if (!fact || fact.status === 'missing') return missingDiagnostic(path, criteria, fact);
      return conditionDiagnostic(path, criteria, fact.value.revealed, {
        label: resolvedLabel(fact, criteria) ?? '',
      });
    }

    case 'page_visibility_at_least': {
      const fact = snapshot.pages[criteria.pageId];
      if (!fact || fact.status === 'missing') return missingDiagnostic(path, criteria, fact);
      const met =
        VISIBILITY_LADDER.indexOf(fact.value.visibilityLevel) >=
        VISIBILITY_LADDER.indexOf(criteria.level);
      return conditionDiagnostic(path, criteria, met, {
        label: resolvedLabel(fact, criteria) ?? '',
        level: criteria.level,
      });
    }

    case 'project_status_is': {
      const fact = snapshot.projects[criteria.pageId];
      if (!fact || fact.status === 'missing') return missingDiagnostic(path, criteria, fact);
      return conditionDiagnostic(path, criteria, eqIgnoreCase(fact.value.status, criteria.status), {
        label: resolvedLabel(fact, criteria) ?? '',
        status: criteria.status,
      });
    }

    case 'project_progress_at_least': {
      const fact = snapshot.projects[criteria.pageId];
      if (!fact || fact.status === 'missing') return missingDiagnostic(path, criteria, fact);
      return conditionDiagnostic(path, criteria, fact.value.progressPercent >= criteria.percent, {
        label: resolvedLabel(fact, criteria) ?? '',
        percent: criteria.percent,
      });
    }

    case 'haven_status_is': {
      const fact = snapshot.havens[criteria.pageId];
      if (!fact || fact.status === 'missing') return missingDiagnostic(path, criteria, fact);
      return conditionDiagnostic(path, criteria, eqIgnoreCase(fact.value.status, criteria.status), {
        label: resolvedLabel(fact, criteria) ?? '',
        status: criteria.status,
      });
    }

    case 'haven_scale_at_least': {
      const fact = snapshot.havens[criteria.pageId];
      if (!fact || fact.status === 'missing') return missingDiagnostic(path, criteria, fact);
      const currentIndex = fact.value.scale
        ? (HAVEN_SCALES as readonly string[]).indexOf(fact.value.scale)
        : -1;
      const targetIndex = (HAVEN_SCALES as readonly string[]).indexOf(criteria.scale);
      const met = currentIndex >= 0 && targetIndex >= 0 && currentIndex >= targetIndex;
      return conditionDiagnostic(path, criteria, met, {
        label: resolvedLabel(fact, criteria) ?? '',
        scale: criteria.scale,
      });
    }

    case 'faction_reputation_at_least': {
      const fact = snapshot.factions[criteria.factionPageId];
      if (!fact || fact.status === 'missing') return missingDiagnostic(path, criteria, fact);
      const score = criteria.axis === 'trust' ? fact.value.trust : fact.value.notoriety;
      return conditionDiagnostic(path, criteria, score >= criteria.value, {
        label: resolvedLabel(fact, criteria) ?? '',
        axis: criteria.axis,
        value: criteria.value,
      });
    }

    case 'party_visited_region': {
      const fact = snapshot.regions[criteria.locationPageId];
      if (!fact || fact.status === 'missing') return missingDiagnostic(path, criteria, fact);
      return conditionDiagnostic(path, criteria, fact.value.visited, {
        label: resolvedLabel(fact, criteria) ?? '',
      });
    }

    case 'real_world_date_after': {
      const now = Date.parse(snapshot.nowIso);
      const target = Date.parse(criteria.isoDate);
      const op = (criteria as any).operator ?? '>=';
      let met = false;
      if (!Number.isNaN(now) && !Number.isNaN(target)) {
        switch (op) {
          case '=':
            met = now === target;
            break;
          case '!=':
            met = now !== target;
            break;
          case '>':
            met = now > target;
            break;
          case '<':
            met = now < target;
            break;
          case '>=':
            met = now >= target;
            break;
          case '<=':
            met = now <= target;
            break;
          default:
            met = now >= target;
        }
      }
      return conditionDiagnostic(path, criteria, met, { date: criteria.label ?? criteria.isoDate });
    }

    case 'manual_release':
      // Never auto-satisfies; a manual release action bypasses evaluation.
      return conditionDiagnostic(path, criteria, false, {});

    default: {
      // Exhaustiveness guard.
      const _never: never = criteria;
      return {
        path,
        criteria: _never,
        outcome: 'missing',
        missingReason: 'unresolved',
        message: { key: 'journal.diag.missing_unresolved', params: {} },
      };
    }
  }
}

function isEmptyRule(rule: ReleaseNode | null | undefined): boolean {
  if (!rule) return true;
  if (rule.type === 'criteria') return !rule.criteria;
  const children = rule.children ?? [];
  return children.length === 0 || children.every((child) => isEmptyRule(child));
}

function evaluateNode(
  node: ReleaseNode,
  snapshot: JournalReleaseSnapshot,
  path: number[],
  out: ConditionDiagnostic[],
): boolean {
  if (node.type === 'criteria') {
    if (!node.criteria) return false;
    const diagnostic = evaluateLeaf(node.criteria, snapshot, path);
    out.push(diagnostic);
    return diagnostic.outcome === 'met';
  }
  const operator: ReleaseGroupOperator = node.operator ?? 'ALL';
  const children = node.children ?? [];
  const results = children.map((child, index) =>
    evaluateNode(child, snapshot, [...path, index], out),
  );
  if (results.length === 0) return false;
  return operator === 'ALL' ? results.every(Boolean) : results.some(Boolean);
}

/**
 * Pure evaluation. Mapping: no rule -> needs_plan; any missing reference ->
 * blocked; valid but unsatisfied -> pending; valid and satisfied -> ready.
 * Content readiness is a separate axis applied by the release service — this
 * function is only about rule conditions.
 */
export function evaluateReleaseRule(
  rule: ReleaseNode | ReleaseRuleEnvelope | null | undefined,
  snapshot: JournalReleaseSnapshot,
): { planState: PlanState; diagnostics: ConditionDiagnostic[] } {
  const node: ReleaseNode | null | undefined = rule && (rule as any).node ? (rule as any).node : (rule as ReleaseNode | null | undefined);
  if (isEmptyRule(node)) {
    return { planState: 'needs_plan', diagnostics: [] };
  }
  const diagnostics: ConditionDiagnostic[] = [];
  const satisfied = evaluateNode(node as ReleaseNode, snapshot, [], diagnostics);
  if (diagnostics.some((diagnostic) => diagnostic.outcome === 'missing')) {
    return { planState: 'blocked', diagnostics };
  }
  return { planState: satisfied ? 'ready' : 'pending', diagnostics };
}

/** Collect every entity reference in a rule tree, grouped by subsystem map key, so the snapshot builder can fetch only what it needs. */
export interface ReleaseRuleReferences {
  sessionPageIds: string[];
  eventIds: string[];
  suggestionIds: string[];
  characterPageIds: string[];
  questPageIds: string[];
  pageIds: string[];
  projectPageIds: string[];
  havenPageIds: string[];
  factionPageIds: string[];
  regionPageIds: string[];
  usesSeason: boolean;
  usesRealWorldClock: boolean;
}

export function collectRuleReferences(
  rule: ReleaseNode | null | undefined,
  acc?: ReleaseRuleReferences,
): ReleaseRuleReferences {
  const refs: ReleaseRuleReferences = acc ?? {
    sessionPageIds: [],
    eventIds: [],
    suggestionIds: [],
    characterPageIds: [],
    questPageIds: [],
    pageIds: [],
    projectPageIds: [],
    havenPageIds: [],
    factionPageIds: [],
    regionPageIds: [],
    usesSeason: false,
    usesRealWorldClock: false,
  };
  if (!rule) return refs;
  if (rule.type === 'criteria' && rule.criteria) {
    const c = rule.criteria;
    switch (c.kind) {
      case 'session_number_at_least':
        // session number criteria do not reference external entities; nothing to collect
        break;
      case 'session_completed':
        refs.sessionPageIds.push(c.sessionPageId);
        break;
      case 'event_occurred':
      case 'event_resolved':
      case 'event_visible':
      case 'event_prerequisite_met':
      case 'time_elapsed_since_event':
        refs.eventIds.push(c.eventId);
        break;
      case 'world_event_accepted':
        refs.suggestionIds.push(c.suggestionId);
        break;
      case 'character_status_is':
        refs.characterPageIds.push(c.pageId);
        break;
      case 'quest_lifecycle_is':
        refs.questPageIds.push(c.pageId);
        break;
      case 'page_revealed':
      case 'page_visibility_at_least':
        refs.pageIds.push(c.pageId);
        break;
      case 'project_status_is':
      case 'project_progress_at_least':
        refs.projectPageIds.push(c.pageId);
        break;
      case 'haven_status_is':
      case 'haven_scale_at_least':
        refs.havenPageIds.push(c.pageId);
        break;
      case 'faction_reputation_at_least':
        refs.factionPageIds.push(c.factionPageId);
        break;
      case 'party_visited_region':
        refs.regionPageIds.push(c.locationPageId);
        break;
      case 'inworld_season_is':
        refs.usesSeason = true;
        break;
      case 'real_world_date_after':
        refs.usesRealWorldClock = true;
        break;
      default:
        break;
    }
    return refs;
  }
  for (const child of rule.children ?? []) collectRuleReferences(child, refs);
  return refs;
}

// ---------------------------------------------------------------------------
// Backward-compatible trigger/operator extension
// ---------------------------------------------------------------------------
/** Minimal trigger kinds for the rule envelope. Triggers are the event
 * sources that cause evaluation to be scheduled; conditions remain the
 * filters evaluated against the snapshot. This enum is intentionally
 * additive and optional so existing persisted `ReleaseNode` JSON remains
 * compatible.
 */
export type TriggerKind =
  | 'ManualInvoke'
  | 'SessionStarted'
  | 'SessionEnded'
  | 'SessionNumberChanged'
  | 'DateReached'
  | 'PublicationCreated'
  | 'SeriesUpdated'
  | 'WorkshopPublished';

/** Comparison operators for future condition expansion (kept as a shared
 * canonical set). Individual criteria may continue to carry value semantics
 * (e.g. `session_number_at_least`) — this type centralizes operator names
 * for UI and rule-builder plumbing.
 */
export type ComparisonOperator = '=' | '!=' | '>' | '<' | '>=' | '<=';

/** A small trigger descriptor used by the evaluation scheduler. Params are
 * optional and interpreted by the caller (e.g. DateReached -> isoDate).
 */
export interface ReleaseTrigger {
  kind: TriggerKind;
  params?: Record<string, string | number | boolean> | null;
}

/** Backing envelope type that pairs an optional trigger with the existing
 * ReleaseNode. Kept optional so writing/reading older persisted rules works
 * without migration; code can incrementally adopt the envelope shape.
 */
export interface ReleaseRuleEnvelope {
  trigger?: ReleaseTrigger | null;
  node?: ReleaseNode | null;
}

