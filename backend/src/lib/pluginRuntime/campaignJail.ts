import type { InterceptorRuntimeContext } from './types.js';

/** Strip or override campaignId so plugins cannot escape tenant scope. */
export function applyCampaignJailToPayload<T extends Record<string, unknown>>(
  payload: T,
  campaignId: string,
): T {
  return {
    ...payload,
    campaignId,
  };
}

export function buildInterceptorContext(input: {
  pluginId: string;
  entity: string;
  phase: InterceptorRuntimeContext['phase'];
  campaignId: string;
}): InterceptorRuntimeContext {
  return {
    pluginId: input.pluginId,
    entity: input.entity,
    phase: input.phase,
    campaignId: input.campaignId,
  };
}
