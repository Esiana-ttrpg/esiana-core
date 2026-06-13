import { env } from '../../config/env.js';
import {
  applyCampaignJailToPayload,
  buildInterceptorContext,
} from './campaignJail.js';
import { applyInterceptorAllowlist } from './interceptorAllowlist.js';
import { getInterceptorsFor } from './interceptorRegistry.js';
import { handlePluginHookFailure } from './pluginDisable.js';
import { cloneJson } from './serialize.js';
import type { RunInterceptorsInput } from './types.js';
import { InterceptorRejectedError } from './types.js';
import { runInterceptorInWorker } from './workerRunner.js';

/**
 * Run registered plugin interceptors for an entity phase.
 * Order = plugin registration order. fail-open hooks skip on error; fail-closed reject.
 */
export async function runDataInterceptors(
  input: RunInterceptorsInput,
): Promise<Record<string, unknown>> {
  const hooks = getInterceptorsFor(input.entity, input.phase);
  if (hooks.length === 0) {
    return applyCampaignJailToPayload(cloneJson(input.payload), input.campaignId);
  }

  let current = applyCampaignJailToPayload(cloneJson(input.payload), input.campaignId);

  for (const hook of hooks) {
    const failMode = hook.failMode ?? 'open';
    const context = buildInterceptorContext({
      pluginId: hook.pluginId,
      entity: input.entity,
      phase: input.phase,
      campaignId: input.campaignId,
    });

    let result;
    try {
      result = await runInterceptorInWorker({
        pluginRoot: hook.pluginRoot,
        scriptPath: hook.scriptPath,
        exportName: hook.exportName ?? 'default',
        payload: current,
        context,
        timeoutMs: env.pluginInterceptorTimeoutMs,
        failMode,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const handled = await handlePluginHookFailure({
        pluginId: hook.pluginId,
        entity: input.entity,
        phase: input.phase,
        reason,
        failMode,
      });
      if (handled.rejectRequest) {
        throw new InterceptorRejectedError(reason);
      }
      continue;
    }

    if (!result.ok) {
      const handled = await handlePluginHookFailure({
        pluginId: hook.pluginId,
        entity: input.entity,
        phase: input.phase,
        reason: result.error ?? 'unknown error',
        failMode,
      });
      if (handled.rejectRequest) {
        throw new InterceptorRejectedError(result.error ?? 'Interceptor rejected');
      }
      continue;
    }

    if (result.payload && typeof result.payload === 'object' && !Array.isArray(result.payload)) {
      const jailed = applyCampaignJailToPayload(
        result.payload as Record<string, unknown>,
        input.campaignId,
      );
      current = applyCampaignJailToPayload(
        applyInterceptorAllowlist(input.entity, input.phase, jailed),
        input.campaignId,
      );
    }
  }

  return current;
}
