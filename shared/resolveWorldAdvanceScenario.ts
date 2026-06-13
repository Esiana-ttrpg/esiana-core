/**
 * Resolve canonical scenario placeholders to live campaign wiki page IDs.
 */
import type { WorldAdvanceEffect, WorldAdvanceBatchRequest } from './worldAdvance.js';
import type { WorldAdvanceScenario } from './worldAdvanceScenarios.js';

function replacePageId(
  value: string | null | undefined,
  placeholderToReal: Map<string, string>,
): string | null | undefined {
  if (value == null) return value;
  return placeholderToReal.get(value) ?? value;
}

function replacePageIdUndefined(
  value: string | null | undefined,
  placeholderToReal: Map<string, string>,
): string | undefined {
  const next = replacePageId(value, placeholderToReal);
  return next ?? undefined;
}

function replacePageIdNull(
  value: string | null | undefined,
  placeholderToReal: Map<string, string>,
): string | null {
  const next = replacePageId(value, placeholderToReal);
  return next ?? null;
}

function remapEffect(
  effect: WorldAdvanceEffect,
  placeholderToReal: Map<string, string>,
): WorldAdvanceEffect {
  switch (effect.type) {
    case 'append_org_relation_event':
      return {
        ...effect,
        orgPageId: replacePageId(effect.orgPageId, placeholderToReal)!,
        targetOrgId: replacePageId(effect.targetOrgId, placeholderToReal)!,
      };
    case 'territory_pressure':
      return {
        ...effect,
        orgPageId: replacePageIdUndefined(effect.orgPageId, placeholderToReal),
        regionPageId: replacePageIdUndefined(effect.regionPageId, placeholderToReal),
      };
    case 'economic_signal':
      return {
        ...effect,
        pageId: replacePageId(effect.pageId, placeholderToReal)!,
      };
    case 'conflict_front':
      return {
        ...effect,
        orgPageIds: effect.orgPageIds?.map(
          (id) => replacePageId(id, placeholderToReal)!,
        ),
        regionPageIds: effect.regionPageIds?.map(
          (id) => replacePageId(id, placeholderToReal)!,
        ),
      };
    case 'record_season_context':
      return {
        ...effect,
        regionPageId: replacePageIdUndefined(effect.regionPageId, placeholderToReal),
      };
    case 'append_location_event':
      return {
        ...effect,
        characterPageId: replacePageId(effect.characterPageId, placeholderToReal)!,
        locationPageId: replacePageId(effect.locationPageId, placeholderToReal)!,
      };
    case 'set_current_location':
      return {
        ...effect,
        characterPageId: replacePageId(effect.characterPageId, placeholderToReal)!,
        locationPageId: replacePageIdNull(effect.locationPageId, placeholderToReal),
      };
    case 'displacement':
      return {
        ...effect,
        characterPageId: replacePageId(effect.characterPageId, placeholderToReal)!,
        fromLocationPageId: replacePageIdUndefined(effect.fromLocationPageId, placeholderToReal),
        toLocationPageId: replacePageIdUndefined(effect.toLocationPageId, placeholderToReal),
      };
    default:
      return effect;
  }
}

/**
 * Substitute scenario `pageKeys` placeholders with real wiki page IDs from `pageIdByKey`.
 * Keys are logical roles (e.g. `regionFrostMarch`); values in effects use `scenario.pageKeys[role]`.
 */
export function resolveScenarioEffects(
  scenario: WorldAdvanceScenario,
  pageIdByKey: Record<string, string>,
): WorldAdvanceBatchRequest {
  const placeholderToReal = new Map<string, string>();
  for (const [role, placeholder] of Object.entries(scenario.pageKeys)) {
    const real = pageIdByKey[role]?.trim();
    if (real) placeholderToReal.set(placeholder, real);
  }

  const effects = scenario.effects.map((e) => remapEffect(e, placeholderToReal));
  return {
    effects,
    note: `Validation scenario: ${scenario.key}`,
    batchIdempotencyKey: `validation-${scenario.key}`,
    advanceTime: { amount: 1, unit: 'days' },
  };
}
