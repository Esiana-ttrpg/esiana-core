import { parentPort, workerData } from 'node:worker_threads';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function main() {
  const { pluginRoot, scriptPath, exportName, payload, context } = workerData;

  try {
    const absolutePath = path.join(pluginRoot, scriptPath);
    const moduleUrl = pathToFileURL(absolutePath).href;
    const mod = await import(moduleUrl);
    const fn = mod[exportName] ?? mod.default;
    if (typeof fn !== 'function') {
      throw new Error(`Interceptor export "${exportName}" is not a function`);
    }

    const result = await fn(payload, context);
    parentPort.postMessage({
      ok: true,
      payload: result === undefined ? payload : result,
    });
  } catch (error) {
    parentPort.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

void main();
