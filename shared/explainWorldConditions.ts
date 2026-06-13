/**
 * Explain derived condition surfaces from batch effects and synthesis citations.
 */
import type { WorldAdvanceEffect, WorldAdvancePreview } from './worldAdvance.js';
import type { WorldConditionSurface } from './worldConditionSurfaces.js';
import { formatConditionAxisLabel } from './worldConditionSurfaces.js';
import type { WorldAdvanceNarrativeSynthesis } from './worldAdvanceSynthesis.js';
import { collectPageIdsFromEffect } from './worldAdvancePreview.js';

export type ConditionExplanationReason = {
  summary: string;
  effectIds: string[];
  citationClauses: string[];
};

export type ConditionSurfaceExplanation = {
  axisLabel: string;
  axis: WorldConditionSurface['axis'];
  level: WorldConditionSurface['level'];
  scopeKind: WorldConditionSurface['scopeKind'];
  regionLabel: string | null;
  isProjection: true;
  reasons: ConditionExplanationReason[];
};

function labelFor(
  pageTitles: Map<string, string> | undefined,
  pageId: string | undefined,
): string | null {
  if (!pageId || !pageTitles) return null;
  return pageTitles.get(pageId) ?? null;
}

function summarizeEffect(
  effect: WorldAdvanceEffect,
  pageTitles?: Map<string, string>,
): string {
  switch (effect.type) {
    case 'conflict_front': {
      const regions =
        effect.regionPageIds
          ?.map((id) => labelFor(pageTitles, id))
          .filter((x): x is string => Boolean(x))
          .join(', ') || null;
      return regions
        ? `Conflict front (${effect.phase}): ${effect.label} at ${regions}`
        : `Conflict front (${effect.phase}): ${effect.label}`;
    }
    case 'economic_signal': {
      const target = labelFor(pageTitles, effect.pageId);
      return target
        ? `Economic ${effect.signal} at ${target}`
        : `Economic ${effect.signal} on ${effect.targetKind}`;
    }
    case 'append_org_relation_event': {
      const org = labelFor(pageTitles, effect.orgPageId);
      const target = labelFor(pageTitles, effect.targetOrgId);
      if (org && target) {
        return `Faction ${effect.stance}: ${org} toward ${target}`;
      }
      return `Faction ${effect.stance} (${effect.relationType})`;
    }
    case 'territory_pressure': {
      const where = labelFor(pageTitles, effect.regionPageId ?? effect.orgPageId);
      return where
        ? `Territory pressure ${effect.pressureLevel} at ${where}`
        : `Territory pressure ${effect.pressureLevel}`;
    }
    case 'displacement': {
      const dest = labelFor(pageTitles, effect.toLocationPageId);
      const who = labelFor(pageTitles, effect.characterPageId);
      if (who && dest) return `Displacement: ${who} toward ${dest}`;
      return 'NPC displacement';
    }
    case 'append_location_event': {
      const who = labelFor(pageTitles, effect.characterPageId);
      const where = labelFor(pageTitles, effect.locationPageId);
      if (who && where) return `${who}: ${effect.kind} toward ${where}`;
      return `Location event: ${effect.kind}`;
    }
    case 'record_season_context': {
      const region = labelFor(pageTitles, effect.regionPageId);
      const note = effect.note ? ` — ${effect.note}` : '';
      return region
        ? `Season context at ${region}${note}`
        : effect.note
          ? `Season: ${effect.note}`
          : 'Season context recorded';
    }
    default:
      return `${effect.domain}: ${effect.type}`;
  }
}

export function buildPageTitlesFromEffects(
  effects: WorldAdvanceEffect[],
  titlesByPageId: Map<string, string>,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const effect of effects) {
    for (const pageId of collectPageIdsFromEffect(effect)) {
      const title = titlesByPageId.get(pageId);
      if (title) out.set(pageId, title);
    }
  }
  return out;
}

export function explainConditionSurface(
  surface: WorldConditionSurface,
  context: {
    effects: WorldAdvanceEffect[];
    narrativeSynthesis: WorldAdvanceNarrativeSynthesis;
    pageTitles?: Map<string, string>;
  },
): ConditionSurfaceExplanation {
  const effectById = new Map(context.effects.map((e) => [e.id, e]));
  const reasons: ConditionExplanationReason[] = [];

  for (const effectId of surface.contributingEffectIds) {
    const effect = effectById.get(effectId);
    const citationClauses = context.narrativeSynthesis.citations
      .filter((c) => c.effectIds.includes(effectId))
      .map((c) => c.clause);

    reasons.push({
      summary: effect
        ? summarizeEffect(effect, context.pageTitles)
        : `Effect ${effectId} (missing from batch)`,
      effectIds: [effectId],
      citationClauses,
    });
  }

  if (reasons.length === 0 && surface.contributingEffectIds.length === 0) {
    reasons.push({
      summary: 'No contributing effects recorded for this surface.',
      effectIds: [],
      citationClauses: [],
    });
  }

  return {
    axisLabel: formatConditionAxisLabel(surface.axis),
    axis: surface.axis,
    level: surface.level,
    scopeKind: surface.scopeKind,
    regionLabel: surface.regionLabel,
    isProjection: true,
    reasons,
  };
}

export function explainWorldAdvancePreview(
  preview: WorldAdvancePreview,
  effects: WorldAdvanceEffect[],
  pageTitles?: Map<string, string>,
): ConditionSurfaceExplanation[] {
  return preview.conditionSurfaces.map((surface) =>
    explainConditionSurface(surface, {
      effects,
      narrativeSynthesis: preview.narrativeSynthesis,
      pageTitles,
    }),
  );
}
