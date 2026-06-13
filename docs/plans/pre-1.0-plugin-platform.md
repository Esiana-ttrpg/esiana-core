# Pre-1.0 Plugin Platform Completion

**Status:** Shipped (2026-06-13)  
**Source plan:** Cursor plan `plugin_platform_completion` (not edited in-repo).

## Tier 1 (blockers)

| Deliverable | Implementation |
|-------------|----------------|
| Domain read services | `PluginHostContext` calendar/timeline/party/world/lore/maps + granular `campaign:read-*` permissions; DTOs in `shared/pluginCampaignRead.ts`; platform routes in `pluginPlatformRoutes.ts` |
| Frontend RPC bridge | `context.api.*` in `frontend/src/lib/pluginApiClient.ts`; enriched via `pluginSlotContext.ts` |
| Config + secrets | `context.config` / `context.secrets`; `PluginSecret` model; export excludes secrets |
| Event bridge | Backend `context.events.subscribe`; frontend `subscribeToDomainEvent` + `dispatchPluginDomainEvent` |
| Widget settings | `registerDashboardWidget({ renderSettings })`; layout persists `widget.config` |
| Plugin pages | `/campaigns/:handle/plugin/:pluginId/:pageId/*`; `PluginPageHost`; `navigation.push` |
| PluginData lifecycle | Default `uninstallPolicy: removePluginData`; uninstall cascades data/config/secrets/assets |
| ImportProvider | Registry + `GET /api/import-providers`; wizard lists plugin providers |

## Tier 2 (ecosystem quality)

| Deliverable | Implementation |
|-------------|----------------|
| Asset upload | `context.assets.upload` + `POST .../assets/upload`; `plugin:assets` permission |
| Sidebar nav | `registerSidebarItem` in Sidebar IA buckets |
| Dashboard grid | `listLayoutWidgets` wired in `DashboardGrid` |
| Search federation | `registerSearchCollection` + campaign plugin search API; `CampaignSearch` federation |

## Deferred (documented)

- `registerEntityAction` / entity page DOM hooks — post-1.0 strict context menus only
- Plugin-to-plugin `registerService` / `consumeService` — use domain reads + events for 1.0

## Moon-tracker litmus test

```ts
calendar.getCurrentDate()                    // domain read (via plugin API route)
events.subscribe('core:calendar:advanced')   // reactivity
registerDashboardWidget({ render, renderSettings })
registerSidebarItem({ section: 'world', pageId: 'moons' })
context.api.post('/moons/recalculate')       // mutate PluginData when needed
```

## Reference

- [capability-matrix.md](../plugins/capability-matrix.md)
- [security-model.md](../plugins/security-model.md)
- [example-plugin](../../plugins/example-plugin/)
