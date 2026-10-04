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

function scoreFaction(faction: ProjectedFactionState): number {
  const activity = ACTIVITY_WEIGHT[faction.activityLevel] ?? 2;
  const tension = faction.bullets.length > 0 ? 2 : 1;
  return activity + tension;
}

function candidateIdempotencyKey(
  nextEpochMinute: string,
  definitionId: string,
  orgPageId: string,
): string {
  return `world-dev:${nextEpochMinute}:${definitionId}:${orgPageId}`;
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
    primaryOrgPageId: faction.subjectPageId,
    eraId: faction.resolvedForEraId,
    momentumState: faction.momentumState,
    trendDirection,
    proposedAcceptTarget: def.acceptTarget,
    suggestionKind: 'faction_pressure',
    trajectoryRef: faction.isExplicit
      ? { subjectPageId: faction.subjectPageId, fromEraId: faction.fromEraId }
      : null,
  };
}

function generateRegionalInstabilityCandidate(
  context: WorldDevelopmentContext,
): ProviderDevelopmentCandidate | null {
  const def = CORE_DEVELOPMENT_DEFINITIONS.find((d) => d.id === 'regional_instability');
  if (!def || !context.projection) return null;

  const fragmenting = context.projectedFactionStates.filter(
    (f) => f.momentumState === 'fragmenting' || f.momentumState === 'desperate',
  );
  if (fragmenting.length < 2) return null;

  const eraId = context.currentEra.id;
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

    const scored = [...context.projectedFactionStates]
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

    const regional = generateRegionalInstabilityCandidate(context);
    if (regional) candidates.push(regional);

    return candidates;
  },
};
