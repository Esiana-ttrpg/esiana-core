# Plugin security model

**Author guide:** [docs/plugin-development/security.md](../../../docs/plugin-development/security.md)

Engineering reference for maintainers (full detail below).

---

Esiana uses **controlled extensibility for a trusted-admin ecosystem** — not a zero-trust browser extension platform.

## Trust tiers

| Tier | Code | Risk | Isolation |
|------|------|------|-----------|
| 1 | Bundled / admin-installed backend `register()` | Trusted privileged code | Coarse manifest `permissions[]`; no process sandbox |
| 2 | Data interceptor hook scripts | Semi-hostile | `worker_threads`, timeouts, concurrency cap, campaign jail |
| 3 | Frontend slot bundles | UI / XSS | CSP + error boundaries + slot-only mount |

Backend plugins run in the main Node process until a third-party marketplace exists. Interceptors are the primary sandboxed surface.

## Install authority

Only **system administrators** may install, upgrade, or remove plugin packages on the server. Campaign admins may **enable, configure, disable, or remove** already-installed campaign-scoped plugins for their campaign — they cannot fetch or register new plugin code. This keeps tarball provenance and upgrade paths under server control.

## Core invariants

1. **No plugin-controlled data reaches persistence without final core validation.**
   Interceptors may suggest changes; controller/Zod checks always re-run before Prisma.

2. **Declarative extension only.**
   Slots, manifest permissions, inline `configSchema`. No arbitrary React tree ownership, remote schema fetch, or `extendRoutes`.

3. **Events are observational, not transactional.**
   Domain events are immutable snapshots for fan-out. No ordering guarantees, retries, or persistence guarantees.

4. **Slot-only mount.**
   Plugins inject into declared slots only — never replace app shells, global routes, or React roots.

5. **HTTPS exfiltration is a known trust-boundary limitation.**
   A trusted admin-installed plugin with allowed `connect-src` can exfiltrate data. CSP filters domains; admin install review and provenance are the controls.

## Interceptor semantics

- **Execution order:** plugin host load order (registration order).
- **failMode `open` (default):** on failure, skip hook and proceed with last safe payload; failures count toward quarantine.
- **failMode `closed`:** on failure, reject request (422); for security validators only.
- **Quarantine:** 5 hook failures in 10 minutes → unregister all hooks for that plugin; set `runtimeStatus: quarantined`.

## Legacy API tokens

Tokens with empty `scopes` retain full account access (legacy). New tokens should declare explicit scopes. Full-scope legacy tokens are logged on use and flagged in the Developer API Keys UI.

| Phase | When | Behavior |
|-------|------|----------|
| 1 | Shipped | Log warnings on legacy empty-scope bearer token use |
| 2 | v1.0 | 403 on empty scopes for campaign mutations, asset routes, and exports |
| 3 | Post-1.0 | Explicit scopes required on all campaign routes |

## Plugin data access (shipped)

Campaign-scoped plugins use **curated domain services** on `PluginHostContext` — not raw Prisma.

| Service | Permission | Notes |
|---------|------------|-------|
| `context.calendar` | `campaign:read-calendar` | Current date, season |
| `context.timeline` | `campaign:read-timeline` | Recent events |
| `context.party` | `campaign:read-party` | Party roster |
| `context.world` | `campaign:read-world` | World summary |
| `context.lore` | `campaign:read-lore` | Characters, orgs, locations (revelation-aware) |
| `context.maps` | `campaign:read-maps` | Map list |
| `context.data` | `plugin:data` | `PluginData` JSON store |
| `context.config` | `plugin:config` | `CampaignPluginSetting.config` |
| `context.secrets` | `plugin:secrets` | Encrypted store; GM write; **excluded from export** |
| `context.assets.upload` | `plugin:assets` | Scoped storage pointer; quota per campaign |

Matching read routes are mounted at `/api/plugin-runtime/:pluginId/campaign/*` for frontend `context.api.get()`.

HTTP routes for campaign-scoped plugins require `campaignHandle` (query or `X-Campaign-Handle` header), set `pluginJailedCampaignId`, and return 404 when the plugin is not enabled for that campaign via `CampaignPluginSetting.isEnabled`. Headless execution (scheduler, domain events) must pass `jailedCampaignId` into `createPluginHostContext`.

## Frontend RPC (`context.api`)

Slot/page/widget contexts expose:

- `context.api.get/post/put/delete(path)` — JSON to `/api/plugin-runtime/:pluginId${path}`
- `context.api.upload(path, FormData)` — multipart (e.g. `/assets/upload`)

Paths are relative to the plugin runtime router. Campaign handle is injected by the host when required.
