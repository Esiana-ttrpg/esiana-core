export const PLUGIN_INTERCEPTOR_MAX_PAYLOAD_BYTES = 262_144;
export const PLUGIN_INTERCEPTOR_MAX_JSON_DEPTH = 10;

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function jsonDepth(value: unknown, depth = 0): number {
  if (depth > PLUGIN_INTERCEPTOR_MAX_JSON_DEPTH + 1) {
    return depth;
  }
  if (value === null || typeof value !== 'object') {
    return depth;
  }
  if (Array.isArray(value)) {
    let max = depth;
    for (const item of value) {
      max = Math.max(max, jsonDepth(item, depth + 1));
    }
    return max;
  }
  let max = depth;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    max = Math.max(max, jsonDepth((value as Record<string, unknown>)[key], depth + 1));
  }
  return max;
}

export function assertJsonSerializable(value: unknown): void {
  const serialized = JSON.stringify(value);
  if (Buffer.byteLength(serialized, 'utf8') > PLUGIN_INTERCEPTOR_MAX_PAYLOAD_BYTES) {
    throw new Error(
      `Interceptor payload exceeds max size (${PLUGIN_INTERCEPTOR_MAX_PAYLOAD_BYTES} bytes)`,
    );
  }
  if (jsonDepth(value) > PLUGIN_INTERCEPTOR_MAX_JSON_DEPTH) {
    throw new Error(
      `Interceptor payload exceeds max JSON depth (${PLUGIN_INTERCEPTOR_MAX_JSON_DEPTH})`,
    );
  }
  cloneJson(value);
}
