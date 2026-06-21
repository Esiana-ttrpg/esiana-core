# Phase 10 — Plugin ecosystem

**Architecture overview:** [docs/architecture/plugin-architecture.md](../../../docs/architecture/plugin-architecture.md)

Phase 10 is split into dependency-ordered parts. This document tracks **Part 10A** (platform contracts), **Part 10B** (observability + machine API), **Part 10C** (sandboxed interceptors), **Part 10D** (frontend slots), and **Part 10E** (OPDS wiki feed study).

**Capability audit:** What plugins can extend today vs. stubbed or deferred surfaces — [capability-matrix.md](./capability-matrix.md).

## Part 10A — Platform contracts (implemented)

### StorageRegistry (provider-agnostic)

- **`StorageDriver`** — technology-neutral contract: `put`, `openRead`, `delete`, `exists`
- **Delivery strategies** — `stream` (host pipes bytes) or `redirect` (short-lived authorized URI)
- **`StorageRegistry`** — `register(providerId, factory)`, `getActive()` via `STORAGE_PROVIDER` (default `filesystem`)
- **Core ships one built-in provider:** `filesystem` (wraps `UPLOADS_DIR`)
- **Extensions:** plugins with `storage:provider` permission register additional providers at runtime

Env:

```text
STORAGE_PROVIDER=filesystem
STORAGE_REDIRECT_THRESHOLD_BYTES=5242880
# Optional override — defaults to root package.json version when unset
# ESIANA_CORE_VERSION=1.2.0
```

Product version for `engines.esiana-core` gating comes from root `package.json` (not an env var).

### Plugin manifest v2

- `permissions[]` — declarative capabilities (`storage:provider`, `plugin:data`, …)
- `engines` — e.g. `{ "esiana-core": "^0.8.0" }`; mismatch auto-disables plugin at load/enable
- `configSchema` — reserved for 10D auto-settings UI

### PluginData

Campaign-scoped JSON store (`PluginData` model). Host access via `PluginHostContext.createPluginDataService(campaignId)` when manifest includes `plugin:data`.

### Identity (core federated OIDC)

- `User.passwordHash` optional (federated-only accounts)
- `Account` model links external OIDC providers (`sub` per upstream IdP)
- **`IdentityProvider`** — instance-configured OIDC upstreams (Authentik, Keycloak, Entra, generic issuer)
- Routes: `GET /api/auth/providers`, `GET /api/auth/oidc/:id/start`, callback, admin CRUD at `/api/admin/identity-providers`
- Login-time **`groupsClaim`** snapshot + promote-only `groupRoleMappings` (no plugin auth strategies)

### First-party plugins (under `/plugins`)

| Id | Permission | Role |
|----|------------|------|
| `foundry-vtt-sync` | `network:fetch` | Integration stub |

**Storage:** S3-compatible remote storage ships as the **`remote-object-storage`** global community plugin (`storageProvider` capability). See [object-storage.md](../deployment/object-storage.md) and [asset-storage-platform.md](../plans/asset-storage-platform.md).

**Removed:** hardcoded `BUILTIN_CATALOG` and admin per-plugin ID form switches.

### Plugin runtime

- `/api/plugin-runtime` requires session or bearer auth
- `register(router, context)` receives `PluginHostContext` for registries and data access

### World Development providers

Plugins with `capabilities: ["developmentProvider"]` and `world-development:provider` permission may register:

- `context.registerDevelopmentProvider({ id, developmentDefinitions, generateCandidates })`
- `context.registerEligibilityProvider({ definitionId, isEligible })`
- `context.registerRationaleProvider({ definitionId, appendRationale })`
- `context.registerDevelopmentResolveProvider({ definitionId, resolveDevelopment })` (optional)

`generateCandidates` receives `WorldDevelopmentContext` with `projectedFactionStates` — do not rebuild trajectory projection in plugins. See [world-development.md](../architecture-internal/world-development.md).

Reference: `settlement-life` in community-plugins.

### Wiki identifiers vs browser paths

Core distinguishes **API identifiers** from **public navigation paths**:

| Concern | Use | Example |
|---------|-----|---------|
| Read/write wiki content | `pageId` on REST routes | `GET /api/campaigns/:handle/wiki/:pageId` |
| Domain events | `pageId` in DTO payloads | `core:wiki:updated` |
| Browser / feed links | `PublicPagePath` via host helper | `/campaigns/:handle/characters/mario` |

Plugins with `wiki:read-public` should call `context.publicWiki.resolvePublicPagePath(campaignHandle, page)` when emitting user-facing links. Do **not** construct `/campaigns/:handle/wiki/:pageId` — that public route no longer exists.

`getPublicPage` / `listPublicPages` return `workspace` and `pathKey` for path resolution. Plugin-owned API URLs (e.g. OPDS acquisition at `/api/public/plugin-runtime/.../pages/:pageId.md`) remain `pageId`-keyed by design.

## Part 10B — Observability and machine API (implemented)

### Domain event bus

- **`dispatchDomainEvent`** — non-blocking fan-out via `setImmediate` ([`backend/src/lib/domainEvents/`](../../backend/src/lib/domainEvents/))
- **Namespaced types** — core uses `core:wiki:created`, `core:wiki:updated`, `core:wiki:deleted`, `core:notebook_arc:*`, `core:calendar:advanced`
- **Plugin emit** — `context.emitDomainEvent('my-plugin:entity:action', payload, campaignId?)` enforces `{pluginId}:` prefix
- **Subscribe** — `context.onDomainEvent('core:*', handler)` or exact match
- **DTOs only** — no Prisma delegates or wiki block payloads in events

Initial controller emitters: wiki create/update/delete, notebook arc CRUD, campaign time advance.

### API bearer tokens

- `UserToken.lastUsedAt` — updated on bearer auth (throttled to 5 minutes)
- `UserToken.scopes` — JSON array; **empty = legacy full access**
- Known scopes: `campaign:read`, `campaign:write`, `plugins:read`, `plugins:manage`
- **`requireTokenScopes([...])`** middleware — session auth bypasses scope checks
- **`/api/plugins`** accepts session or bearer; bearer requires `plugins:read` / `plugins:manage` per route

## Part 10C — Sandboxed interceptors and campaign jail (implemented)

### Data interceptors

- **`registerDataInterceptor`** on `PluginHostContext` — requires manifest permission `data:interceptor` and a plugin-root-relative `scriptPath`
- **Phases** — `beforeCreate`, `beforeUpdate`, `beforeDelete` per entity (e.g. `wikiPage`, `notebookArc`)
- **Worker sandbox** — hooks run in `worker_threads` via dynamic import ([`backend/src/lib/pluginRuntime/`](../../backend/src/lib/pluginRuntime/))
- **Timeout** — `PLUGIN_INTERCEPTOR_TIMEOUT_MS` (default **200ms**)
- **Fail-open** — on timeout/error the plugin is auto-disabled, system-logged, and the host proceeds with the last safe payload
- **Limits** — `PLUGIN_MAX_HOOKS_PER_PLUGIN` (default 10), `PLUGIN_MAX_CONCURRENT_INTERCEPTORS` (default 4)

Hook signature:

```javascript
export default function myHook(payload, context) {
  // context: { pluginId, entity, phase, campaignId }
  return { ...payload, title: payload.title + '!' };
}
```

### Campaign jail

- Interceptor payloads always receive the host `campaignId`; plugins cannot override tenant scope
- Campaign-scoped plugins with `jailedCampaignId` cannot read/write plugin data for other campaigns

### Wired controller paths

- `createWikiPage` — `wikiPage:beforeCreate`
- `updateWikiPageLayout` — `wikiPage:beforeUpdate` (template metadata)
- `updateWikiPageVisibility` — `wikiPage:beforeUpdate`
- `createNotebookArc` — `notebookArc:beforeCreate`

### Example plugin

`example-plugin` registers `hooks/wiki-page-before-create.js` and prefixes new wiki titles with `[Example]`.

Env:

```text
PLUGIN_INTERCEPTOR_TIMEOUT_MS=200
PLUGIN_MAX_HOOKS_PER_PLUGIN=10
PLUGIN_MAX_CONCURRENT_INTERCEPTORS=4
```

## Part 10D — Frontend slots and presentation (implemented)

### UI slot system

Slots live in [`frontend/src/plugins/slots/`](../../frontend/src/plugins/slots/):

| Slot | Surface |
|------|---------|
| `header` | App header (campaign shell) |
| `sidebar` | Campaign sidebar footer |
| `editor` | Wiki page editor extensions (`WikiPage`, lazy mount via `useDeclaredPluginSlot`) |
| `dashboard` | Campaign dashboard widgets (`CampaignDashboardPage`, lazy mount) |
| `map:overlay` | Map canvas overlay layer |
| `map:toolbar` | Map viewer toolbar |
| `map:token-context` | Reserved for pin context menus (legacy slot name) |
| `campaign-plugin-settings` | Campaign Settings → Campaign Plugins configure panel |

Each slot is wrapped in a **React Error Boundary** with a fallback card so a broken plugin cannot collapse the layout.

Manifest declares allowed slots:

```json
{
  "permissions": ["ui:slot"],
  "uiSlots": ["sidebar", "header"]
}
```

Plugins register at runtime via `register(registry)` on their frontend entry module.

### Frontend plugin loader

- **`loadFrontendPlugin`** — dynamic `import()` from `/api/plugin-assets/:pluginId/*` (session auth, path-jail)
- **`PluginRuntimeProvider`** — loads enabled plugins when entering a campaign
- **`GET /api/campaigns/:campaignId/plugins/frontend-runtime`** — enabled global + campaign plugin descriptors (includes per-plugin config)

### Config schema auto-settings

- **`configSchemaToTemplate`** — JSON Schema object subset → `PluginConfigForm` fields
- **`mergePluginConfigFields`** — merges manifest `configTemplate` with `configSchema` (manual keys win)

### Presentation registry

[`frontend/src/lib/pluginPresentation.ts`](../../frontend/src/lib/pluginPresentation.ts) defines `PluginTheme`, `CustomFieldDefinition`, and `LayoutWidget` registration helpers for future theme/editor extensions.

### CSS isolation policy

Plugin slot hosts use scoped wrapper classes (`esiana-plugin-slot`, `esiana-plugin-{id}`). Plugin authors should avoid global Tailwind resets; prefer scoped utility classes inside their slot root.

## Part 10E — OPDS wiki feed study (implemented)

Spike + reference plugin for e-reader syndication. Full study: [opds-wiki-feed-study.md](./opds-wiki-feed-study.md).

### Reference plugin: `wiki-opds-feed`

- **Scope:** `campaign` — installed and enabled per campaign in **Campaign Settings → Campaign Plugins**
- **Permissions:** `feed:public` (routes), `wiki:read-public` (public wiki read API), `feed:opds` (Atom XML builder), `ui:slot` + `campaign-plugin-settings` slot (catalog URL in configure panel)
- **Catalog:** `GET .../wiki-opds-feed/c/{campaignSlug}/opds/catalog.atom` (OPDS 1.2 Atom)
- **Acquisition:** `GET .../wiki-opds-feed/c/{campaignSlug}/opds/pages/{pageId}.md`
- **Visibility:** only wiki pages with `Public` visibility for that campaign; session notes excluded
- **Gates:** plugin enabled for the campaign, and campaign `isPublicViewable` must be true

Plugin implementation: [`community-plugins/wiki-opds-feed/`](../../../community-plugins/wiki-opds-feed/). Core provides the generic Atom builder ([`backend/src/lib/opds/atom.ts`](../backend/src/lib/opds/atom.ts)), permission-gated host APIs (`publicWiki`, `feeds` on `PluginHostContext`), and the `campaign-plugin-settings` UI slot host.

## Plugin UI guidelines (design convergence)

Plugin frontend slots must follow core design doctrine:

- [deprecated-ui-patterns.md](../deprecated-ui-patterns.md) — do not introduce stop-list patterns
- [density-doctrine.md](../density-doctrine.md) — respect panel caps and calm density
- [representational-defaults.md](../representational-defaults.md) — inclusive example data in demos

Slot-specific:

| Slot | Guidance |
|------|----------|
| `wiki:decorate` | Read-only metadata injection; no dashboard chrome or bordered card stacks |
| `dashboard` (Campaign Home) | User-facing name **Campaign Home**; max widget density inherited from host |
| `sidebar` | Navigation tone only; no analytics strips |
| `editor` | Match codex Reading/Writing density; no ultrawide column proliferation |

## Phase 10 complete

All planned parts (10A–10E) are implemented.

## Phase 10.5 — Hardening (implemented)

See [security-model.md](./security-model.md), [data-interceptors.md](./data-interceptors.md), [domain-events.md](./domain-events.md).

| Item | Status |
|------|--------|
| Route firewall (register-time validation) | Done |
| Coarse `PluginPermission` registry | Done |
| Interceptor allowlists + failMode + quarantine | Done |
| Worker concurrency / payload / depth limits | Done |
| Plugin diagnostics + client quarantine hint | Done |
| Legacy API token sunset path | Done |
| Dynamic CSP + trusted private-network policy | Done |
| Install provenance (checksum, trustedInstall) | Done |
| Uninstall lifecycle (`uninstallPolicy`) | Done |
| Read-only wiki decorators (`wiki:decorate`) | Done |

**Deferred:** `extendRoutes` (use `register(router, context)`), remote `configSchemaUrl`, `isolated-vm`.

See [capability-matrix.md](./capability-matrix.md) for the full surface audit and pre-1.0 gap recommendations.
