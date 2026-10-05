import type { DevelopmentDefinition } from '../../../shared/coreDevelopmentDefinitions.js';
import { CORE_DEVELOPMENT_DEFINITIONS } from '../../../shared/coreDevelopmentDefinitions.js';
import type {
  DevelopmentProvider,
  ProjectedFactionState,
  ProviderDevelopmentCandidate,
  WorldDevelopmentContext,
} from '../../../shared/developmentProvider.js';
import type { DevelopmentRationaleLine } from '../../../shared/worldDevelopmentMetadata.js';
import type { FactionMomentumState } from '../../../shared/factionMomentumMetadata.js';
import {
  MOMENTUM_TO_TREND_DIRECTION,
  type TrendDirection,
} from '../../../shared/worldEventSuggestionMetadata.js';

const ACTIVITY_WEIGHT: Record<string, number> = {
  dormant: 0,
  low: 1,
  medium: 2,
  high: 3,
};

const TRAJECTORY_SHIFT_DEF_ID = 'trajectory_shift';

function scoreFaction(faction: ProjectedFactionState): number {
  const activity = ACTIVITY_WEIGHT[faction.activityLevel] ?? 2;
  const tension = faction.bullets.length > 0 ? 2 : 1;
  return activity + tension;
}

function candidateIdempotencyKey(
  nextEpochMinute: string,
  definitionId: string,
  subjectPageId: string,
): string {
  return `world-dev:${nextEpochMinute}:${definitionId}:${subjectPageId}`;
}

function buildTrajectoryRationale(faction: ProjectedFactionState): DevelopmentRationaleLine[] {
  const directionPart = faction.direction?.trim();
  const label = directionPart
    ? `${faction.subjectTitle} — ${directionPart}`
    : `${faction.subjectTitle} — ${faction.momentumLabel}`;
  const lines: DevelopmentRationaleLine[] = [{ kind: 'trajectory', text: label }];
  if (faction.outcome?.trim()) {
    lines.push({ kind: 'trajectory', text: `Toward: ${faction.outcome.trim()}` });
  }
  if (faction.bullets[0]) {
    lines.push({ kind: 'pressure', text: faction.bullets[0] });
  }
  return lines;
}

function titleForDefinition(def: DevelopmentDefinition, faction: ProjectedFactionState): string {
  return `${faction.subjectTitle} — ${def.label}`;
}

function narrativeForDefinition(
  def: DevelopmentDefinition,
  faction: ProjectedFactionState,
): string | null {
  if (faction.bullets[0]) return faction.bullets[0];
  if (faction.direction?.trim()) {
    const toward = faction.outcome?.trim() ? ` toward ${faction.outcome.trim()}` : '';
    return `${def.label} may unfold as ${faction.subjectTitle} continues ${faction.direction.trim()}${toward}.`;
  }
  return `${def.label} may unfold as ${faction.subjectTitle} continues on a ${faction.momentumLabel.toLowerCase()} trajectory.`;
}

function definitionsForMomentum(
  defs: DevelopmentDefinition[],
  momentum: FactionMomentumState,
): DevelopmentDefinition[] {
  return defs.filter((d) => d.applicableMomentumStates.includes(momentum));
}

function pickDefinitionForFaction(
  defs: DevelopmentDefinition[],
  faction: ProjectedFactionState,
  usedDefinitionIds: Set<string>,
): DevelopmentDefinition | null {
  const applicable = definitionsForMomentum(defs, faction.momentumState);
  for (const def of applicable) {
    const key = `${def.id}:${faction.subjectPageId}`;
    if (usedDefinitionIds.has(key)) continue;
    usedDefinitionIds.add(key);
    return def;
  }
  return null;
}

function buildCandidate(
  def: DevelopmentDefinition,
  faction: ProjectedFactionState,
  context: WorldDevelopmentContext,
): ProviderDevelopmentCandidate {
  const trendDirection: TrendDirection | null =
    MOMENTUM_TO_TREND_DIRECTION[faction.momentumState] ?? null;
  return {
    definitionId: def.id,
    developmentType: def.developmentType,
    title: titleForDefinition(def, faction),
    narrative: narrativeForDefinition(def, faction),
    rationale: buildTrajectoryRationale(faction),
    idempotencyKey: candidateIdempotencyKey(
      context.nextEpochMinute,
      def.id,
      faction.subjectPageId,
    ),
    // Legacy storage name — carries generic subject page id (org / character / location).
    primaryOrgPageId: faction.subjectPageId,
    eraId: faction.resolvedForEraId,
    momentumState: faction.momentumState,
    trendDirection,
    proposedAcceptTarget: def.acceptTarget,
    // Legacy DB kind: subject-scoped (not organization-exclusive).
    suggestionKind: 'faction_pressure',
    trajectoryRef: faction.isExplicit
      ? { subjectPageId: faction.subjectPageId, fromEraId: faction.fromEraId }
      : null,
  };
}

/**
 * Modest Char/Loc candidate — literal restatement of authored direction/outcome.
 * Does not invent intermediate events (plugins / Ollama own that).
 */
function modestTrajectoryShiftCopy(subject: ProjectedFactionState): {
  title: string;
  narrative: string;
} {
  const direction = subject.direction?.trim() || null;
  const outcome = subject.outcome?.trim() || null;
  const title = direction
    ? `${subject.subjectTitle} — ${direction}`
    : `${subject.subjectTitle} — Trajectory`;
  let narrative: string;
  if (direction && outcome) {
    narrative = `${subject.subjectTitle} is ${direction.toLowerCase()} toward ${outcome.toLowerCase()}.`;
  } else if (outcome) {
    narrative = `Trajectory toward: ${outcome}`;
  } else if (direction) {
    narrative = `${subject.subjectTitle} continues ${direction.toLowerCase()}.`;
  } else {
    narrative = `${subject.subjectTitle} continues on an authored trajectory.`;
  }
  return { title, narrative };
}

function buildModestTrajectoryShiftCandidate(
  subject: ProjectedFactionState,
  context: WorldDevelopmentContext,
  def: DevelopmentDefinition,
): ProviderDevelopmentCandidate {
  const { title, narrative } = modestTrajectoryShiftCopy(subject);
  return {
    definitionId: def.id,
    developmentType: def.developmentType,
    title,
    narrative,
    rationale: buildTrajectoryRationale(subject),
    idempotencyKey: candidateIdempotencyKey(
      context.nextEpochMinute,
      def.id,
      subject.subjectPageId,
    ),
    // Legacy storage name — Character/Location page ids are expected here.
    primaryOrgPageId: subject.subjectPageId,
    eraId: subject.resolvedForEraId,
    momentumState: null,
    trendDirection: null,
    proposedAcceptTarget: def.acceptTarget,
    // Legacy DB kind: subject-scoped suggestion.
    suggestionKind: 'faction_pressure',
    trajectoryRef: {
      subjectPageId: subject.subjectPageId,
      fromEraId: subject.fromEraId,
    },
  };
}

function generateRegionalInstabilityCandidate(
  context: WorldDevelopmentContext,
): ProviderDevelopmentCandidate | null {
  const def = CORE_DEVELOPMENT_DEFINITIONS.find((d) => d.id === 'regional_instability');
  if (!def || !context.projection) return null;

  const fragmenting = context.projectedFactionStates.filter(
    (f) =>
      f.subjectCategory === 'organizations' &&
      (f.momentumState === 'fragmenting' || f.momentumState === 'desperate'),
  );
  if (fragmenting.length < 2) return null;

  const eraId = context.currentEra.id;
  if (!eraId) return null;
  const trendDirection: TrendDirection = 'destabilizing';
  const narrative = context.projection.eraTrends[0] ?? 'Instability is spreading between factions.';

  return {
    definitionId: def.id,
    developmentType: def.developmentType,
    title: 'Regional Instability',
    narrative,
    rationale: [
      {
        kind: 'trajectory',
        text: `${fragmenting.length} factions show destabilizing trajectories`,
      },
      { kind: 'pressure', text: narrative },
    ],
    idempotencyKey: `world-dev:${context.nextEpochMinute}:regional_instability:${eraId}`,
    primaryOrgPageId: null,
    eraId,
    momentumState: null,
    trendDirection,
    proposedAcceptTarget: def.acceptTarget,
    suggestionKind: 'era_trend',
    trajectoryRef: null,
  };
}

export const coreDevelopmentProvider: DevelopmentProvider = {
  id: 'core',
  developmentDefinitions: () => CORE_DEVELOPMENT_DEFINITIONS,
  generateCandidates(context: WorldDevelopmentContext): ProviderDevelopmentCandidate[] {
    const candidates: ProviderDevelopmentCandidate[] = [];
    const usedKeys = new Set<string>();

    const orgStates = context.projectedFactionStates.filter(
      (f) => f.subjectCategory === 'organizations',
    );

    const scored = [...orgStates]
      .filter((f) => f.momentumState !== 'stable' && f.momentumState !== 'dormant')
      .sort((a, b) => scoreFaction(b) - scoreFaction(a));

    for (const faction of scored) {
      const def = pickDefinitionForFaction(
        CORE_DEVELOPMENT_DEFINITIONS,
        faction,
        usedKeys,
      );
      if (!def) continue;
      candidates.push(buildCandidate(def, faction, context));
    }

    const trajectoryShiftDef = CORE_DEVELOPMENT_DEFINITIONS.find(
      (d) => d.id === TRAJECTORY_SHIFT_DEF_ID,
    );
    if (trajectoryShiftDef) {
      for (const subject of context.projectedFactionStates) {
        if (subject.subjectCategory === 'organizations') continue;
        if (!subject.isExplicit) continue;
        const hasIntent =
          Boolean(subject.direction?.trim()) || Boolean(subject.outcome?.trim());
        if (!hasIntent) continue;
        const key = `${trajectoryShiftDef.id}:${subject.subjectPageId}`;
        if (usedKeys.has(key)) continue;
        usedKeys.add(key);
        candidates.push(
          buildModestTrajectoryShiftCandidate(subject, context, trajectoryShiftDef),
        );
      }
    }

    const regional = generateRegionalInstabilityCandidate(context);
    if (regional) candidates.push(regional);

    return candidates;
  },
};
