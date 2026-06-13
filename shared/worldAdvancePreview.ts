/**
 * Pure preview projection for world-advance batches (no DB).
 */
import type { WorldAdvanceEffect } from './worldAdvance.js';
import type { WorldAdvanceBatchRequest, WorldAdvancePreview } from './worldAdvance.js';
import { WORLD_ADVANCE_VERSION } from './worldAdvance.js';
import { deriveWorldConditionsAt } from './worldConditionSurfaces.js';
import { synthesizeWorldAdvanceNarrative } from './worldAdvanceSynthesis.js';

export function effectToConditionDeriveRow(
  effect: WorldAdvanceEffect,
  regionPageId?: string | null,
): {
  id: string;
  domain: string;
  type: string;
  regionPageId?: string;
  orgPageId?: string;
  characterPageId?: string;
  signal?: string;
  phase?: string;
  pressureLevel?: string;
  stance?: string;
  kind?: string;
  toLocationPageId?: string;
} {
  const base = {
    id: effect.id,
    domain: effect.domain,
    type: effect.type,
  };
  switch (effect.type) {
    case 'append_org_relation_event':
      return { ...base, stance: effect.stance, orgPageId: effect.orgPageId };
    case 'territory_pressure':
      return {
        ...base,
        regionPageId: effect.regionPageId ?? regionPageId ?? undefined,
        orgPageId: effect.orgPageId,
        pressureLevel: effect.pressureLevel,
      };
    case 'economic_signal': {
      const loc =
        effect.targetKind === 'location' ? effect.pageId : regionPageId ?? undefined;
      return { ...base, regionPageId: loc, signal: effect.signal };
    }
    case 'conflict_front':
      return {
        ...base,
        phase: effect.phase,
        regionPageId: effect.regionPageIds?.[0],
      };
    case 'displacement':
      return {
        ...base,
        characterPageId: effect.characterPageId,
        toLocationPageId: effect.toLocationPageId,
        kind: 'displacement',
      };
    case 'append_location_event':
      return {
        ...base,
        characterPageId: effect.characterPageId,
        regionPageId: effect.locationPageId,
        kind: effect.kind,
      };
    case 'record_season_context':
      return { ...base, regionPageId: effect.regionPageId ?? undefined };
    default:
      return base;
  }
}

export function collectPageIdsFromEffect(effect: WorldAdvanceEffect): string[] {
  const ids: string[] = [];
  switch (effect.type) {
    case 'append_org_relation_event':
      ids.push(effect.orgPageId, effect.targetOrgId);
      break;
    case 'territory_pressure':
      if (effect.orgPageId) ids.push(effect.orgPageId);
      if (effect.regionPageId) ids.push(effect.regionPageId);
      break;
    case 'economic_signal':
      ids.push(effect.pageId);
      break;
    case 'conflict_front':
      ids.push(...(effect.orgPageIds ?? []), ...(effect.regionPageIds ?? []));
      break;
    case 'append_location_event':
    case 'set_current_location':
    case 'displacement':
      ids.push(effect.characterPageId);
      if ('locationPageId' in effect && effect.locationPageId) ids.push(effect.locationPageId);
      if (effect.type === 'displacement') {
        if (effect.fromLocationPageId) ids.push(effect.fromLocationPageId);
        if (effect.toLocationPageId) ids.push(effect.toLocationPageId);
      }
      break;
    case 'record_season_context':
      if (effect.regionPageId) ids.push(effect.regionPageId);
      break;
    case 'consequence_bridge':
      if (effect.consequence.type === 'set_faction_stance') {
        ids.push(effect.consequence.factionPageId);
      }
      if (effect.consequence.type === 'circulate_rumor') {
        if (effect.consequence.targetLocationPageId) {
          ids.push(effect.consequence.targetLocationPageId);
        }
        if (effect.consequence.targetOrgPageId) {
          ids.push(effect.consequence.targetOrgPageId);
        }
      }
      break;
    default:
      break;
  }
  return ids;
}

export function buildPreviewFromBatchRequest(
  request: WorldAdvanceBatchRequest,
  options: {
    projectedEpochMinute?: string;
    asOfEpochMinute?: string;
    asOfLabel?: string | null;
    pageTitles: Map<string, string>;
    regionPageIdByEffect?: (effect: WorldAdvanceEffect) => string | null | undefined;
  },
): WorldAdvancePreview {
  const projected = options.projectedEpochMinute ?? '10080';
  const asOf = options.asOfEpochMinute ?? projected;
  const deriveRows = request.effects.map((effect) =>
    effectToConditionDeriveRow(
      effect,
      options.regionPageIdByEffect?.(effect) ?? null,
    ),
  );
  const regionLabels = new Map<string, string>();
  for (const [id, title] of options.pageTitles) {
    regionLabels.set(id, title);
  }
  const conditionSurfaces = deriveWorldConditionsAt({
    asOfEpochMinute: projected,
    effects: deriveRows,
    regionLabels,
  });
  const narrativeSynthesis = synthesizeWorldAdvanceNarrative({
    asOfLabel: options.asOfLabel ?? 'Late Winter, 842 AE',
    effects: request.effects,
    conditionSurfaces,
    pageTitles: options.pageTitles,
    seasonLabel: options.asOfLabel,
  });
  const effectPreviews = request.effects.map((effect) => ({
    effectId: effect.id,
    domain: effect.domain,
    type: effect.type,
    summary: `Apply ${effect.type}`,
    warnings: [] as string[],
    pendingConfirmations:
      effect.type === 'suggest_border_keyframe'
        ? ['Border keyframe requires GM confirmation in map editor']
        : [],
  }));
  return {
    version: WORLD_ADVANCE_VERSION,
    asOfEpochMinute: asOf,
    asOfLabel: options.asOfLabel ?? null,
    projectedEpochMinute: projected,
    effectPreviews,
    conditionSurfaces,
    narrativeSynthesis,
    warnings: [],
  };
}
