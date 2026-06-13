# Data interceptors

Semi-hostile hook scripts run in worker threads with JSON-serializable input/output.

## Hook signature

```javascript
export default function myHook(payload, context) {
  // context: { pluginId, entity, phase, campaignId }
  return { ...payload, title: payload.title + '!' };
}
```

## Phases

`beforeCreate`, `beforeUpdate`, `beforeDelete` — per entity (e.g. `wikiPage`, `notebookArc`).

## Execution order

Hooks for the same entity/phase run **sequentially in plugin registration order**. Later hooks see output from earlier hooks.

## failMode

| Mode | On timeout/error |
|------|------------------|
| `open` (default) | Skip hook; proceed with last safe payload |
| `closed` | Reject request with 422 |

Register with optional `failMode` on `registerDataInterceptor({ ..., failMode: 'closed' })`.

## Field allowlist

After each hook, output is stripped to entity-specific allowed fields. Privilege fields (`campaignId`, `id`, `createdById`, visibility escalation) cannot be changed by plugins.

## Quarantine

5 failures in 10 minutes → all hooks for that plugin are unregistered; `runtimeStatus` set to `quarantined`. Check admin plugin diagnostics for recent errors.

## Environment

```text
PLUGIN_INTERCEPTOR_TIMEOUT_MS=200
PLUGIN_MAX_HOOKS_PER_PLUGIN=10
PLUGIN_MAX_CONCURRENT_INTERCEPTORS=4
PLUGIN_INTERCEPTOR_MAX_PAYLOAD_BYTES=262144
PLUGIN_INTERCEPTOR_MAX_JSON_DEPTH=10
```
