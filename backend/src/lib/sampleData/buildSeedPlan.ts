import { buildGenericSeedPlan, type GenericSeedPlanContext } from './buildGenericSeedPlan.js';
import type { SeedPlan } from './seedPlan.js';
import type { SampleDataProfileParams } from './sampleDataRegistry.js';

export interface BuildSeedPlanContext extends Omit<
  GenericSeedPlanContext,
  | 'sessionCountOverride'
  | 'locationCountOverride'
  | 'factionCountOverride'
  | 'npcCountOverride'
  | 'pageCountOverride'
  | 'mapCountOverride'
> {
  profileParams?: SampleDataProfileParams;
}

function resolveOrganizationCount(params: SampleDataProfileParams): number {
  return params.organizationCount ?? params.factionCount ?? 0;
}

function resolveCharacterCount(params: SampleDataProfileParams): number {
  return params.characterCount ?? params.npcCount ?? 0;
}

export function buildSeedPlan(ctx: BuildSeedPlanContext): SeedPlan {
  const params = ctx.profileParams;
  return buildGenericSeedPlan({
    ...ctx,
    sessionCountOverride: params?.sessionCount,
    locationCountOverride: params?.locationCount,
    factionCountOverride: params ? resolveOrganizationCount(params) : undefined,
    npcCountOverride: params ? resolveCharacterCount(params) : undefined,
    pageCountOverride: params?.pageCount,
    mapCountOverride: params?.mapCount,
    unresolvedRate: params?.unresolvedRate ?? ctx.unresolvedRate,
  });
}

export { buildGenericSeedPlan } from './buildGenericSeedPlan.js';
