/**
 * Tier 1 — shared assertions for world-advance validation (tests + dev report).
 */
import type { WorldAdvancePreview } from './worldAdvance.js';
import type { WorldConditionAxis, WorldConditionLevel, WorldConditionSurface } from './worldConditionSurfaces.js';
import type { WorldAdvanceProjectionDomain } from './worldAdvance.js';
import type { ScenarioExpectations, WorldAdvanceScenario } from './worldAdvanceScenarios.js';
import { buildScenarioBatchRequest, buildScenarioPageTitles } from './worldAdvanceScenarios.js';
import { buildPreviewFromBatchRequest } from './worldAdvancePreview.js';

export type ValidationViolation = {
  kind: 'positive' | 'anti_goal' | 'locality' | 'citation';
  scenario: string;
  rule: string;
  detail: string;
};

export function buildScenarioPreview(scenario: WorldAdvanceScenario): WorldAdvancePreview {
  const pageTitles = buildScenarioPageTitles(scenario);
  return buildPreviewFromBatchRequest(buildScenarioBatchRequest(scenario), {
    projectedEpochMinute: '10080',
    asOfEpochMinute: '10080',
    asOfLabel: 'Late Winter, 842 AE',
    pageTitles,
  });
}

function synthesisText(preview: WorldAdvancePreview): string {
  return [preview.narrativeSynthesis.headline, ...preview.narrativeSynthesis.paragraphs]
    .join(' ')
    .toLowerCase();
}

function surfaceMatchesAxisLevel(
  surface: WorldConditionSurface,
  axis: WorldConditionAxis,
  level: WorldConditionLevel,
): boolean {
  return surface.axis === axis && surface.level === level;
}

export function assertPositiveExpectations(
  preview: WorldAdvancePreview,
  positive: ScenarioExpectations['positive'],
  scenarioKey: string,
): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  const text = synthesisText(preview);

  if (positive.axes) {
    for (const [axis, expectedLevel] of Object.entries(positive.axes) as Array<
      [WorldConditionAxis, WorldConditionLevel]
    >) {
      const match = preview.conditionSurfaces.some(
        (s) =>
          s.scopeKind === 'region' &&
          surfaceMatchesAxisLevel(s, axis, expectedLevel),
      );
      if (!match) {
        violations.push({
          kind: 'positive',
          scenario: scenarioKey,
          rule: `axis:${axis}`,
          detail: `Expected region surface ${axis}=${expectedLevel}`,
        });
      }
    }
  }

  if (positive.synthesisMustInclude) {
    for (const fragment of positive.synthesisMustInclude) {
      if (!text.includes(fragment.toLowerCase())) {
        violations.push({
          kind: 'positive',
          scenario: scenarioKey,
          rule: `synthesis includes:${fragment}`,
          detail: `Synthesis missing "${fragment}"`,
        });
      }
    }
  }

  return violations;
}

export function assertAntiGoals(
  preview: WorldAdvancePreview,
  antiGoals: ScenarioExpectations['antiGoals'],
  scenarioKey: string,
  batchDomains: Set<WorldAdvanceProjectionDomain>,
): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  const text = synthesisText(preview);

  if (antiGoals.axesMustNot) {
    for (const [axis, forbiddenLevels] of Object.entries(antiGoals.axesMustNot) as Array<
      [WorldConditionAxis, WorldConditionLevel[]]
    >) {
      for (const surface of preview.conditionSurfaces) {
        if (surface.axis !== axis) continue;
        if (!forbiddenLevels.includes(surface.level as WorldConditionLevel)) continue;
        violations.push({
          kind: 'anti_goal',
          scenario: scenarioKey,
          rule: `axis forbidden:${axis}:${surface.level}`,
          detail: `${surface.scopeKind} surface ${axis}=${surface.level} (effects: ${surface.contributingEffectIds.join(', ')})`,
        });
      }
    }
  }

  if (antiGoals.synthesisMustNotInclude) {
    for (const fragment of antiGoals.synthesisMustNotInclude) {
      if (text.includes(fragment.toLowerCase())) {
        violations.push({
          kind: 'anti_goal',
          scenario: scenarioKey,
          rule: `synthesis forbidden:${fragment}`,
          detail: `Synthesis contained "${fragment}"`,
        });
      }
    }
  }

  if (antiGoals.domainsMustNotSurface?.length) {
    for (const domain of antiGoals.domainsMustNotSurface) {
      if (batchDomains.has(domain)) continue;
      const leaked = preview.effectPreviews.some((p) => p.domain === domain);
      if (leaked) {
        violations.push({
          kind: 'anti_goal',
          scenario: scenarioKey,
          rule: `domain bleed:${domain}`,
          detail: `Effect preview surfaced domain ${domain} without batch effect`,
        });
      }
    }
  }

  return violations;
}

export function assertNoProjectionBleed(
  preview: WorldAdvancePreview,
  antiGoals: ScenarioExpectations['antiGoals'],
  scenarioKey: string,
  batchDomains: Set<WorldAdvanceProjectionDomain>,
): ValidationViolation[] {
  return assertAntiGoals(preview, antiGoals, scenarioKey, batchDomains);
}

export function assertSignalLocality(
  preview: WorldAdvancePreview,
  locality: ScenarioExpectations['locality'],
  scenario: WorldAdvanceScenario,
  scenarioKey: string,
  options?: { pageIdByKey?: Record<string, string> },
): ValidationViolation[] {
  const violations: ValidationViolation[] = [];
  const resolvePageId = (role: string) =>
    options?.pageIdByKey?.[role]?.trim() ?? scenario.pageKeys[role];
  const inScopeIds = new Set(
    locality.inScopePageKeys.map(resolvePageId).filter(Boolean),
  );
  const outScopeIds = new Set(
    locality.outOfScopePageKeys.map(resolvePageId).filter(Boolean),
  );
  const outTitles = new Set(
    locality.outOfScopePageKeys
      .map((k) => scenario.pageTitles[k])
      .filter((t): t is string => Boolean(t)),
  );
  const pageTitles = buildScenarioPageTitles(scenario);

  for (const surface of preview.conditionSurfaces) {
    if (surface.scopeKind !== 'region' || !surface.regionPageId) continue;
    if (outScopeIds.has(surface.regionPageId)) {
      violations.push({
        kind: 'locality',
        scenario: scenarioKey,
        rule: 'out_of_scope_surface',
        detail: `Region surface on ${surface.regionLabel ?? surface.regionPageId} (${surface.axis})`,
      });
    }
    if (inScopeIds.size > 0 && !inScopeIds.has(surface.regionPageId)) {
      violations.push({
        kind: 'locality',
        scenario: scenarioKey,
        rule: 'unexpected_region_surface',
        detail: `Surface outside in-scope set: ${surface.regionPageId}`,
      });
    }
  }

  for (const citation of preview.narrativeSynthesis.citations) {
    for (const title of outTitles) {
      if (citation.clause.includes(title)) {
        violations.push({
          kind: 'locality',
          scenario: scenarioKey,
          rule: 'citation_names_out_of_scope',
          detail: `Citation mentions "${title}": ${citation.clause}`,
        });
      }
    }
  }

  const effectIds = new Set(scenario.effects.map((e) => e.id));
  for (const surface of preview.conditionSurfaces) {
    for (const id of surface.contributingEffectIds) {
      if (!effectIds.has(id)) {
        violations.push({
          kind: 'citation',
          scenario: scenarioKey,
          rule: 'orphan_contributing_effect',
          detail: `Surface cites unknown effect ${id}`,
        });
      }
    }
  }

  for (const [, title] of pageTitles) {
    if (!outTitles.has(title)) continue;
    const mentioned = preview.narrativeSynthesis.paragraphs.some((p) => p.includes(title));
    if (mentioned) {
      violations.push({
        kind: 'locality',
        scenario: scenarioKey,
        rule: 'synthesis_names_out_of_scope',
        detail: `Paragraph names out-of-scope region "${title}"`,
      });
    }
  }

  return violations;
}

export function validateScenarioPreview(
  scenario: WorldAdvanceScenario,
  previewOverride?: WorldAdvancePreview,
  options?: { pageIdByKey?: Record<string, string> },
): {
  preview: WorldAdvancePreview;
  violations: ValidationViolation[];
  passed: boolean;
} {
  const preview = previewOverride ?? buildScenarioPreview(scenario);
  const batchDomains = new Set(scenario.effects.map((e) => e.domain));
  const violations = [
    ...assertPositiveExpectations(preview, scenario.expectations.positive, scenario.key),
    ...assertAntiGoals(
      preview,
      scenario.expectations.antiGoals,
      scenario.key,
      batchDomains,
    ),
    ...assertSignalLocality(
      preview,
      scenario.expectations.locality,
      scenario,
      scenario.key,
      options,
    ),
  ];
  return { preview, violations, passed: violations.length === 0 };
}
