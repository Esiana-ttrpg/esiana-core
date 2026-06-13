import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { env } from '../../config/env.js';
import type { InterceptorRuntimeContext, InterceptorWorkerResult } from './types.js';
import { assertJsonSerializable } from './serialize.js';

const WORKER_URL = new URL('./interceptorWorker.mjs', import.meta.url);

let activeRuns = 0;

export function getActiveInterceptorRuns(): number {
  return activeRuns;
}

export async function runInterceptorInWorker(input: {
  pluginRoot: string;
  scriptPath: string;
  exportName: string;
  payload: Record<string, unknown>;
  context: InterceptorRuntimeContext;
  timeoutMs?: number;
  failMode?: 'open' | 'closed';
}): Promise<InterceptorWorkerResult> {
  if (activeRuns >= env.pluginMaxConcurrentInterceptors) {
    const message = 'Interceptor concurrency limit reached';
    if (input.failMode === 'closed') {
      return { ok: false, error: message };
    }
    return { ok: false, error: message };
  }

  assertJsonSerializable({ payload: input.payload, context: input.context });

  const timeoutMs = input.timeoutMs ?? env.pluginInterceptorTimeoutMs;

  return new Promise((resolve) => {
    activeRuns += 1;
    const worker = new Worker(fileURLToPath(WORKER_URL), {
      workerData: {
        pluginRoot: input.pluginRoot,
        scriptPath: input.scriptPath,
        exportName: input.exportName,
        payload: input.payload,
        context: input.context,
      },
      resourceLimits: {
        maxOldGenerationSizeMb: env.pluginWorkerMaxOldGenerationMb,
      },
    });

    let settled = false;
    const finish = (result: InterceptorWorkerResult) => {
      if (settled) return;
      settled = true;
      activeRuns -= 1;
      void worker.terminate();
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({ ok: false, error: `Interceptor timed out after ${timeoutMs}ms` });
    }, timeoutMs);

    worker.once('message', (message: InterceptorWorkerResult) => {
      clearTimeout(timer);
      finish(message);
    });

    worker.once('error', (error) => {
      clearTimeout(timer);
      finish({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    worker.once('exit', (code) => {
      if (settled) return;
      clearTimeout(timer);
      if (code === 0) return;
      finish({ ok: false, error: `Interceptor worker exited with code ${code}` });
    });
  });
}
