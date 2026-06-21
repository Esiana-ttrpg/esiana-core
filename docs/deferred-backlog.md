# Deferred backlog (from plans)

> **Last audited:** 2026-06-13 (core/plugin/won't-do split; removed superseded outdated items)  
> Intent and rationale live in each linked plan snapshot. **Delivery tracking** uses [GitHub Issues](https://github.com/Esiana-ttrpg/esiana-core/issues).  
> Update this file when closing a plan or shipping a feature that was previously deferred.

## How to use


| Status        | Meaning                                                     |
| ------------- | ----------------------------------------------------------- |
| `open`        | Still deferred; not tracked as a GitHub Issue yet          |
| `in-todo`     | Tracked via [GitHub Issues](https://github.com/Esiana-ttrpg/esiana-core/issues) |
| `partial`     | Part shipped; remainder still deferred                      |
| `shipped`     | Was deferred in a plan but has since landed                 |
| `won't-do`    | Explicit core skip (architecture/product decision)          |
| `plugin-only` | Not core; community plugin or optional integration          |


**Maintenance:** When merging plan work, search this file for the plan filename, update status, bump **Last audited**.

---

## Shipped after being deferred

These appeared in plan "out of scope" or deferral notes but have since landed — listed so we do not re-open them.


| Item                                                                                   | Was deferred in                                                                                                                                              | Shipped in                                                                                               |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Parental deletion workflows                                                            | [wiki_internal_linking](../../docs/plans/wiki_internal_linking_3c198735.plan.md)                                                                             | Phase 2 wiki safeguards                                                                                  |
| Breadcrumb UX (full hierarchy trails)                                                  | [wiki_parent_hierarchy](../../docs/plans/wiki_parent_hierarchy_72f81cba.plan.md)                                                                             | Phase 2                                                                                                  |
| Cross-hierarchy discoverability                                                        | [finish_phase_2_polish](../../docs/plans/finish_phase_2_polish_ddf14e50.plan.md)                                                                             | Phase 2                                                                                                  |
| Player session anthology / snapshot formatter                                          | [phase_2.5_and_2.75](../../docs/plans/phase_2.5_and_2.75_852f8eca.plan.md), [finish_phase_2_polish](../../docs/plans/finish_phase_2_polish_ddf14e50.plan.md) | Phase 2.5 — All View → Snapshot tab                                                                      |
| Visual Atlas — projection of lore-attached media (replaces Gallery wiki category)      | Option C visual atlas plan                                                                                                                                   | Visual Atlas v1                                                                                          |
| Campaign registry browse (install from campaign settings)                              | Superseded by server-only install + campaign enable model                                                                                                    | [plugin-tiers.md](./platform/plugin-tiers.md)                                                            |
| Core storage layer abstraction (`StorageDriver`)                                       | [plugin_registry_activation](../../docs/plans/plugin_registry_activation_ee645924.plan.md)                                                                   | Phase 10A                                                                                                |
| Domain event dispatcher (direct hooks, not full refactor)                              | [phase_8_notifications](../../docs/plans/phase_8_notifications_cf3fa65f.plan.md), [phase_10](../../docs/plans/phase_10_plugin_ecosystem_12730998.plan.md)    | Phase 10B                                                                                                |
| App version source of truth                                                            | [app_version_source_of_truth](../../docs/plans/app_version_source_of_truth_dd25daff.plan.md)                                                                 | Phase 5.5 / platform                                                                                     |
| Platform guides (directory + shareable `/guides/`* routes)                             | recruitment_lobby_ux_deferred, directory guides plan                                                                                                         | [changelog.md](../changelog.md) — Recruitment & hub                                                      |
| Async campaign backup / background ZIP                                                 | [campaign_backup_zip](../../docs/plans/campaign_backup_zip_da0c0480.plan.md)                                                                                 | Phase 8 notifications                                                                                    |
| Campaign access framework Phase 1 (`campaignOwnerUserId`, capability policy)           | Collapsed DM-as-owner model                                                                                                                                  | 2026-06 — [campaign-access-model.md](platform/campaign-access-model.md)                                  |
| Mail router live send engine (Phase 5 generic router)                                  | [todo.md](../todo.md) Phase 5                                                                                                                                | Phase 8 nodemailer — notification email + admin SMTP test; transactional reset/invite follow-up          |
| Map presence & visibility unified epic                                                 | [map-presence-visibility.md](./plans/map-presence-visibility.md)                                                                                             | [changelog.md](../changelog.md) — Maps & spatial                                                         |
| Map atlas extensions (7A)                                                              | [map-presence-visibility.md](./plans/map-presence-visibility.md)                                                                                             | [changelog.md](../changelog.md) — Maps & spatial                                                         |
| Fog / revelation as presence state (9B)                                                | [map-presence-visibility.md](./plans/map-presence-visibility.md)                                                                                             | [changelog.md](../changelog.md) — Revelation & visibility                                                |
| Temporal map projection (7C)                                                           | [map-presence-visibility.md](./plans/map-presence-visibility.md)                                                                                             | [changelog.md](../changelog.md) — Maps & spatial                                                         |
| Territorial / political borders by era (authoring v1)                                  | Phase 7.6 deferrals                                                                                                                                          | [changelog.md](../changelog.md) — Layer 3; [map-border-overlays.md](platform/map-border-overlays.md)     |
| `resolveMapObjectPresenceDetailed()` reason codes                                      | [phase_7_spatial_mapping](../../docs/plans/phase_7_spatial_mapping_9e4ffeb4.plan.md)                                                                         | `shared/mapPresence.ts`; `backend/src/lib/mapPresence.test.ts`                                           |
| Pin-level fog independent of wiki page visibility                                      | [map-presence-visibility.md](./plans/map-presence-visibility.md)                                                                                             | `MapSceneObject.revelation`; maps controller                                                             |
| Dynamic vector map masking from wiki permissions                                       | Phase 24 / map deferrals                                                                                                                                     | [changelog.md](../changelog.md) — Layer 3; `mapSceneService.ts`                                          |
| LFG join-request context (timezone, applicant info)                                    | Phase 4 recruitment deferrals                                                                                                                                | [changelog.md](../changelog.md) — Recruitment & hub                                                      |
| LFG approval deny reasons                                                              | Phase 4 recruitment deferrals                                                                                                                                | [changelog.md](../changelog.md) — Recruitment & hub                                                      |
| Continuity / descriptive longevity line on recruitment lobby                           | [recruitment_lobby_ux_deferred](../../docs/plans/recruitment_lobby_ux_deferred.plan.md)                                                                      | Recruitment directory UX (P3 partial remainder still open below)                                         |
| Safety tools glossary + recruitment help UI                                            | recruitment_lobby_ux_deferred                                                                                                                                | [shared/safetyToolsGlossary.ts](../shared/safetyToolsGlossary.ts)                                        |
| Table Expectations wiki doc + Before You Apply slot (P0)                               | [recruitment_lobby_ux_deferred](../../docs/plans/recruitment_lobby_ux_deferred.plan.md)                                                                      | Recruitment lobby UX                                                                                     |
| Before-apply vibe note (`recruitmentBeforeApplyNote`, P1)                              | [recruitment_lobby_ux_deferred](../../docs/plans/recruitment_lobby_ux_deferred.plan.md)                                                                      | Recruitment lobby UX                                                                                     |
| Canonical page editor P0 (draft wiring, reflow, blockCapabilities, draft flush)        | [canonical-page-editor.md](./plans/canonical-page-editor.md)                                                                                                 | [changelog.md](../changelog.md) — Canonical page editor v0.9                                             |
| Canonical page editor P1 (responsive polish, save status, appearance, reader mode)     | [canonical-page-editor.md](./plans/canonical-page-editor.md)                                                                                                 | [changelog.md](../changelog.md) — Canonical page editor + Design convergence                             |
| Data interceptor hooks (10C)                                                           | [phase_10_plugin_ecosystem](../../docs/plans/phase_10_plugin_ecosystem_12730998.plan.md)                                                                     | [data-interceptors.md](./plugins/data-interceptors.md)                                                   |
| UI slot system (10D)                                                                   | [phase_10_plugin_ecosystem](../../docs/plans/phase_10_plugin_ecosystem_12730998.plan.md)                                                                     | [phase-10-ecosystem.md](./plugins/phase-10-ecosystem.md)                                                 |
| Content lifecycle hooks (`wiki:decorate`)                                              | [phase_10_plugin_ecosystem](../../docs/plans/phase_10_plugin_ecosystem_12730998.plan.md)                                                                     | [wikiContentDecorators.ts](../backend/src/lib/plugins/wikiContentDecorators.ts)                          |
| Dynamic CSP for remote frontend plugins                                                | [phase_10_plugin_ecosystem](../../docs/plans/phase_10_plugin_ecosystem_12730998.plan.md)                                                                     | [security-model.md](./plugins/security-model.md)                                                         |
| Cross-namespace route firewall                                                         | [phase_10_plugin_ecosystem](../../docs/plans/phase_10_plugin_ecosystem_12730998.plan.md)                                                                     | [pluginRouteGuard.ts](../backend/src/lib/plugins/pluginRouteGuard.ts)                                    |
| OIDC routes and IdP configuration                                                      | [plugin_ecosystem_readiness](../../docs/plans/plugin_ecosystem_readiness_80ccc931.plan.md)                                                                   | Federated identity core — [changelog.md](../changelog.md)                                                |
| Hybrid OIDC login UI, linked `Account` providers                                       | Enterprise auth deferrals                                                                                                                                    | Federated identity core — [changelog.md](../changelog.md)                                                |
| Campaign Home “Living Threads” narrative rail (`threadBundle`)                         | Phase 18 campaign-home deferrals                                                                                                                             | [changelog.md](../changelog.md) — Layer 2 / Campaign Home                                                |
| Quick Access sidebar stub (Planned badge, hidden by default)                           | Bookmarks / sidebar deferrals                                                                                                                                | [changelog.md](../changelog.md) — Personal pins vs Quick Access                                          |
| Sidebar IA reorder (PLAY / WORLD / TIMELINE / TOOLS + Adventure submenu)               | Sidebar layout / navigation deferrals                                                                                                                        | [sidebar-ia-reorder.md](./plans/sidebar-ia-reorder.md) — [changelog.md](../changelog.md)                 |
| Character Hub (campaign cast board)                                                    | Characters index UX deferrals                                                                                                                                | [character-hub.md](./plans/character-hub.md) — [changelog.md](../changelog.md)                           |
| Block-scoped continuity (Codex jump-to-block)                                          | [canonical-page-editor.md](./plans/canonical-page-editor.md) P1                                                                                              | [changelog.md](../changelog.md) — Canonical page editor                                                  |
| Inline relationship linking UX (entity pills, `[[` / slash, backlink preview)          | [canonical-page-editor.md](./plans/canonical-page-editor.md) P1                                                                                              | [changelog.md](../changelog.md) — Canonical page editor                                                  |
| Semantic index hooks per block type                                                    | [canonical-page-editor.md](./plans/canonical-page-editor.md) P1                                                                                              | [changelog.md](../changelog.md) — Canonical page editor                                                  |
| Downtime Phases 1–6 (hub through world events)                                         | [downtime-havens-ledger.md](./plans/downtime-havens-ledger.md)                                                                                               | [changelog.md](../changelog.md) — Layer 1 / Layer 3 downtime                                             |
| Downtime timeline projection + entity annotations (Phase 7 partial)                    | [downtime-havens-ledger.md](./plans/downtime-havens-ledger.md) Phase 7                                                                                       | [changelog.md](../changelog.md) — Layer 1; [downtime-timeline.md](platform/downtime-timeline.md)         |
| Authoring workflow Tier 1–2 (instrumentation, Workshop, Insights)                      | [authoring-workflow.md](./plans/authoring-workflow.md)                                                                                                       | [changelog.md](../changelog.md) — Layer 5 authoring workflow                                             |
| Layer 5 workspace batch (scenes, storyboard, investigation, timelines, relations)      | [narrative-engine-layers.md](./plans/narrative-engine-layers.md)                                                                                             | [changelog.md](../changelog.md) — Layer 5 Narrative Workspace                                            |
| Layer 4 diagnostics batch (orphan, clue redundancy, density, foreshadowing, circular)  | [narrative-engine-layers.md](./plans/narrative-engine-layers.md)                                                                                             | [changelog.md](../changelog.md) — Layer 4 Diagnostics                                                    |
| Campaign ACL Phases A–E (capability migration, `canEditPage`, collaboration overrides) | Campaign access deferrals                                                                                                                                    | [changelog.md](../changelog.md) — [0.9.0]; [campaign-access-model.md](platform/campaign-access-model.md) |
| Campaign access Phase 3 (discoverability enum, public surface controls)                | Campaign access deferrals                                                                                                                                    | [changelog.md](../changelog.md) — [0.9.0]                                                                |
| Workspace-first campaign URLs (`pathKey`, semantic routes)                             | Wiki routing deferrals                                                                                                                                       | [changelog.md](../changelog.md) — [0.9.0]                                                                |
| Core Sample Data Generator (Phases 1–2)                                                | Campaign seeder / content-pack deferrals                                                                                                                     | [changelog.md](../changelog.md) — [0.9.0]; [sample-data-generator.md](platform/sample-data-generator.md) |
| Campaign Hub revamp (resume hero, attention queue, pinning)                            | Hub UX deferrals                                                                                                                                             | [changelog.md](../changelog.md) — [0.9.0]                                                                |
| OrganizationPageShell (institutional power surfaces)                                   | Entity shell deferrals                                                                                                                                       | [changelog.md](../changelog.md) — [0.9.0]                                                                |
| Quest time simulation (deadlines, offscreen progress)                                  | [downtime-havens-ledger.md](./plans/downtime-havens-ledger.md) Phase 7                                                                                       | [changelog.md](../changelog.md) — [0.9.0]; [quest-time-simulation.md](platform/quest-time-simulation.md) |
| Linking UX hardening (v0.9)                                                            | [canonical-page-editor.md](./plans/canonical-page-editor.md) P1                                                                                              | [changelog.md](../changelog.md) — [0.9.0]                                                                |
| World Development + Downtime resolution wizard                                         | [downtime-havens-ledger.md](./plans/downtime-havens-ledger.md) Phase 8                                                                                       | [changelog.md](../changelog.md) — [Unreleased]; [world-development.md](platform/world-development.md)    |
| Scheduled effects (v1.1) — narrative schedules + occurrence audit                      | [downtime-havens-ledger.md](./plans/downtime-havens-ledger.md) Phase 8                                                                                       | [changelog.md](../changelog.md) — [Unreleased]; [scheduled-effects.md](platform/scheduled-effects.md)    |
| Asset storage platform (`@esiana/storage-s3`, storage registry)                        | [asset-storage-platform.md](./plans/asset-storage-platform.md)                                                                                               | [changelog.md](../changelog.md) — [Unreleased]                                                           |
| Visibility System Phase 3 (shared primitives, universal chips)                         | Campaign access deferrals                                                                                                                                    | [changelog.md](../changelog.md) — [0.9.0]                                                                |


---

## By domain

### Sessions & notes


| Item                                                                                          | Status    | Target         | Source                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------- | --------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compile-hub sidebar link to session anthology / snapshot                                      | `partial` | —              | [phase_2.5_and_2.75](../../docs/plans/phase_2.5_and_2.75_852f8eca.plan.md), [session_snapshot_unified_path](../../docs/plans/session_snapshot_unified_path_c1491fb6.plan.md), [todo.md](../todo.md) |
| Paragraph-level interleave in combined export (needs note-entry chunks)                       | `open`    | —              | [session_snapshot_unified_path](../../docs/plans/session_snapshot_unified_path_c1491fb6.plan.md)                                                                                                    |
| PDF / print CSS for session snapshot                                                          | `open`    | —              | [session_snapshot_unified_path](../../docs/plans/session_snapshot_unified_path_c1491fb6.plan.md)                                                                                                    |
| Second query path for anthology or references                                                 | `open`    | —              | [session_snapshot_unified_path](../../docs/plans/session_snapshot_unified_path_c1491fb6.plan.md)                                                                                                    |
| Derive roster from combined `columns` instead of Perspectives API (optional)                  | `open`    | —              | [session_snapshot_unified_path](../../docs/plans/session_snapshot_unified_path_c1491fb6.plan.md)                                                                                                    |
| Admin script to dedupe duplicate session author pages `(sessionGroupId, sessionNoteAuthorId)` | `open`    | —              | [fix_session_notes](../../docs/plans/fix_session_notes_e0993733.plan.md)                                                                                                                            |
| Per-author ReferencesWidget filter when selecting roster member                               | `in-todo` | Session polish | [todo.md](../todo.md), [sessions-and-notes.md](../../docs/features/sessions-and-notes.md)                                                                                                           |


### Wiki & linking


| Item                                                                   | Status    | Target         | Source                                                                                                                                                                     |
| ---------------------------------------------------------------------- | --------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Campaign-wide link health dashboard                                    | `open`    | —              | [wiki_internal_linking](../../docs/plans/wiki_internal_linking_3c198735.plan.md)                                                                                           |
| Prisma DB triggers / plugin `transformWikiContent` hooks for link sync | `open`    | Phase 10       | [wiki_internal_linking](../../docs/plans/wiki_internal_linking_3c198735.plan.md)                                                                                           |
| TipTap Mention extension / `[[visible]]` mention nodes                 | `open`    | Phase 15       | [global_tiptap_auto-link](../../docs/plans/global_tiptap_auto-link_98e06c55.plan.md), [document_auto-link_scan](../../docs/plans/document_auto-link_scan_172ceb9c.plan.md) |
| Ambient real-time auto-linking as you type                             | `open`    | Phase 15       | [document_auto-link_scan](../../docs/plans/document_auto-link_scan_172ceb9c.plan.md)                                                                                       |
| Bulk preview alerts listing all would-link phrases                     | `open`    | Phase 15       | [document_auto-link_scan](../../docs/plans/document_auto-link_scan_172ceb9c.plan.md)                                                                                       |
| Full-document bulk auto-link scan (cursor/selection only today)        | `open`    | —              | [global_tiptap_auto-link](../../docs/plans/global_tiptap_auto-link_98e06c55.plan.md)                                                                                       |
| Session note location picker — deep Locations nesting                  | `open`    | —              | [wiki_breadcrumb_hierarchy](../../docs/plans/wiki_breadcrumb_hierarchy_1776a958.plan.md)                                                                                   |
| Create Location flow parent picker (deep nest via settings only)       | `open`    | —              | [wiki_breadcrumb_hierarchy](../../docs/plans/wiki_breadcrumb_hierarchy_1776a958.plan.md)                                                                                   |
| Infobox "Region" / metadata "Parent" as wiki links                     | `open`    | —              | [wiki_breadcrumb_hierarchy](../../docs/plans/wiki_breadcrumb_hierarchy_1776a958.plan.md)                                                                                   |
| Dedicated `/locations/:id` routes                                      | `open`    | —              | [wiki_breadcrumb_hierarchy](../../docs/plans/wiki_breadcrumb_hierarchy_1776a958.plan.md)                                                                                   |
| Migrate `metadata.importMetadata.tags` into relational tags on import  | `open`    | —              | [wiki_tagging_system](../../docs/plans/wiki_tagging_system_8af5e06f.plan.md)                                                                                               |
| Tag color picker UI (schema field exists)                              | `open`    | —              | [wiki_tagging_system](../../docs/plans/wiki_tagging_system_8af5e06f.plan.md)                                                                                               |
| `/wiki/tags` URL segment                                               | `open`    | —              | [wiki_tagging_system](../../docs/plans/wiki_tagging_system_8af5e06f.plan.md)                                                                                               |
| Entity inspector field search (`searchKeywords`)                       | `open`    | —              | [entity-inspector-ux.md](./plans/entity-inspector-ux.md)                                                                                                                   |
| Per-game-system sidebar presets and stat-block templates               | `open`    | Future release | [gamesystems.md](../../docs/reference/gamesystems.md)                                                                                                                                |
| Cached visual atlas manifests / incremental invalidation on wiki save  | `open`    | Post-v1        | Visual Atlas v1 on-demand projection                                                                                                                                       |
| Quick Access sidebar (DM/Co-DM campaign shortcuts)                     | `in-todo` | v1.1+          | [todo.md](../todo.md) — distinct from personal dashboard pins (`PageShortcut`)                                                                                             |
| CampaignQuickAccess data model + `/wiki/quick-access` CRUD             | `in-todo` | v1.1+          | [todo.md](../todo.md)                                                                                                                                                      |


### Templates & theming


| Item                                                       | Status    | Target   | Source                                                                                                   |
| ---------------------------------------------------------- | --------- | -------- | -------------------------------------------------------------------------------------------------------- |
| Theme FOUC fix via `theme-init.js` cached resolved profile | `open`    | —        | [cascading_theme_resolver](../../docs/plans/cascading_theme_resolver_ac08765c.plan.md)                   |
| Campaign-scoped theme engine (DM CSS, fonts, palette)      | `in-todo` | Phase 15 | [todo.md](../todo.md)                                                                                    |


### Campaign access


| Item                                               | Status    | Target                                        | Source                                                                                                       |
| -------------------------------------------------- | --------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `billing.manage` implementation                    | `won't-do` | Post-1.0                                      | [campaign-access-model.md](platform/campaign-access-model.md) — platform/commerce; not visibility UX         |
| Per-resource ACL overrides / custom campaign roles | `open`    | Post-1.0                                      | [campaign-access-model.md](platform/campaign-access-model.md) — write-authority; not visibility presentation |
| Rich per-campaign `publicCapabilities`             | `in-todo` | Visibility System Phase 3 (future sub-bullet) | [todo.md](../todo.md) — public campaign presentation controls                                                |


### Chronology & calendars


| Item                                                              | Status     | Target   | Source                                                                                                                                              |
| ----------------------------------------------------------------- | ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fantasy-Calendar eras import (`static_data.eras`)                 | `open`     | —        | [fantasy_calendar_import_fix](../../docs/plans/fantasy_calendar_import_fix_90be01d4.plan.md)                                                        |
| FC seasons / leap_days / weather import                           | `open`     | —        | [fantasy_calendar_import_fix](../../docs/plans/fantasy_calendar_import_fix_90be01d4.plan.md)                                                        |
| Non-master calendar import (master chronology only)               | `open`     | —        | [fantasy_calendar_import_fix](../../docs/plans/fantasy_calendar_import_fix_90be01d4.plan.md)                                                        |
| Fantasy-Calendar weather engine / `seasons.data` integration      | `open`     | —        | [climate_aspect_icons](../../docs/plans/climate_aspect_icons_1590ac6a.plan.md)                                                                      |
| Chronology timeline wiki page existence — server-side deep checks | `open`     | —        | [chronology_layout_pivot](../../docs/plans/chronology_layout_pivot_649afae5.plan.md)                                                                |
| Multi-calendar temporal mapping                                   | `in-todo`  | Phase 15 | [todo.md](../todo.md)                                                                                                                               |
| Chronology-appended wiki timestamp badges on save                 | `in-todo`  | Phase 15 | [todo.md](../todo.md)                                                                                                                               |
| `TimelineEra` DB model resurrection (removed 20260529)            | `won't-do` | —        | Map presence plan — use `CalendarEventCategory`, event-linked epoch ranges, optional `ChronologyPeriod`; `repeatUnit: ERAS` remains year alias only |


### Maps & spatial


| Item                                                                                                      | Status               | Target  | Source                                                                                                     |
| --------------------------------------------------------------------------------------------------------- | -------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| VTT tactical features (initiative, combat automation, LOS, spell templates, tactical movement)            | `plugin-only` | —       | [philosophy.md](../philosophy.md) anti-goals; `layer:3` `legacy: Phase 7.6`                                |
| Re-optimize map display dimensions when `MAP_DISPLAY_MAX_EDGE` changes (admin action + pin scale warning) | `open`               | —       | [phase_7_spatial_mapping](../../docs/plans/phase_7_spatial_mapping_9e4ffeb4.plan.md)                       |
| `leaflet.markercluster` when >50 pins visible                                                             | `open`               | —       | [phase_7_spatial_mapping](../../docs/plans/phase_7_spatial_mapping_9e4ffeb4.plan.md)                       |
| Read-only "Interactive map" link in Location wiki settings                                                | `open`               | —       | [maps_hub_and_settings](../../docs/plans/maps_hub_and_settings_4db85410.plan.md)                           |
| Homepage interactive world map on recruitment hub                                                         | `open`               | —       | [homepage_recruitment_consolidation](../../docs/plans/homepage_recruitment_consolidation_fbd017a2.plan.md) |
| Codex hierarchy ancestor reveal (`includeAncestorIds` wired at call site)                                 | `open`               | Post-v1 | [todo.md](../todo.md) Post-v1 watchpoints                                                                  |
| Parent→children index before optimizing forest `.filter()` loops                                          | `open`               | Post-v1 | [todo.md](../todo.md) Post-v1 watchpoints                                                                  |


### Quest hub


| Item                                                                 | Status             | Target | Source                                                               |
| -------------------------------------------------------------------- | ------------------ | ------ | -------------------------------------------------------------------- |
| Within-column order in list/tree views (title sort unchanged)        | `open` | —      | [quest-hub-kanban-ordering.md](./plans/quest-hub-kanban-ordering.md) |
| Rebalance all `boardOrder` values when fractional precision exhausts | `open` | —      | [quest-hub-kanban-ordering.md](./plans/quest-hub-kanban-ordering.md) |


### Notifications & realtime


| Item                                                          | Status     | Target    | Source                                                                                                  |
| ------------------------------------------------------------- | ---------- | --------- | ------------------------------------------------------------------------------------------------------- |
| WebSockets / SSE live push                                    | `won't-do` | —         | [phase_8_notifications](../../docs/plans/phase_8_notifications_cf3fa65f.plan.md), [todo.md](../todo.md) |
| Push notifications (mobile/PWA)                               | `in-todo`  | Phase 16  | [phase_8_notifications](../../docs/plans/phase_8_notifications_cf3fa65f.plan.md), [todo.md](../todo.md) |
| Per-campaign notification preference overrides                | `open`     | —         | [phase_8_notifications](../../docs/plans/phase_8_notifications_cf3fa65f.plan.md)                        |
| Co-DM informational notifications on ownership transfer       | `open`     | —         | [phase_8_notifications](../../docs/plans/phase_8_notifications_cf3fa65f.plan.md)                        |
| @mention / page-assignment notifications                      | `open`     | Phase 15+ | [phase_8_notifications](../../docs/plans/phase_8_notifications_cf3fa65f.plan.md)                        |
| `NotificationChannel` registry (beyond hardcoded SMTP)        | `open`     | Phase 11+ | [phase_10_plugin_ecosystem](../../docs/plans/phase_10_plugin_ecosystem_12730998.plan.md)                |
| Full `dispatchDomainEvent` refactor (centralize all emitters) | `won't-do` | —         | [phase_8_notifications](../../docs/plans/phase_8_notifications_cf3fa65f.plan.md), [todo.md](../todo.md) |


### Security & visibility


| Item                                                            | Status     | Target | Source                                                                                     |
| --------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------ |
| Global `/api/`* baseline rate limiter                           | `won't-do` | —      | [phase_9_security](../../docs/plans/phase_9_security_f3a9ea7e.plan.md)                     |
| Dashboard identity display (player names on campaign dashboard) | `open`     | —      | [phase_3.5_identity_mapping](../../docs/plans/phase_3.5_identity_mapping_aacc0fd5.plan.md) |
| Campaign Home tabs/presets/role layouts                         | `open`     | —      | Phase 18 campaign-home deferrals (single blended surface shipped first)                    |
| Campaign Home weather/world-state synthesis                     | `open`     | —      | Phase 18 campaign-home deferrals                                                           |
| Campaign Presentation logo/icon in hero                         | `open`     | —      | Campaign Presentation follow-up (banner + tagline shipped)                                 |
| Campaign Presentation recruitment preview / campaign trailer    | `open`     | —      | Campaign Presentation follow-up                                                            |
| Reposition banner (drag-to-focus focal point UI)                | `open`     | —      | Hero banner modes — focalPointX/Y stored; UI deferred                                      |
| Recruitment/hub thumbnails use hero focal point + display mode  | `open`     | —      | Hero banner modes follow-up                                                                |


### Downtime (won't do)


| Item                                                                                       | Status     | Target | Source                                                                                                  |
| ------------------------------------------------------------------------------------------ | ---------- | ------ | ------------------------------------------------------------------------------------------------------- |
| Campaign display alias system (genre labels for downtime/haven/project/ledger/world_event) | `won't-do` | —      | [downtime-havens-ledger.md](./plans/downtime-havens-ledger.md) Phase 9; `ui-only` `convergence:pre-1.0` |


### Plugins & ecosystem


| Item                                                                | Status        | Target            | Source                                                                                                                                                                             |
| ------------------------------------------------------------------- | ------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Optional local Ollama/RAG pipeline (privacy-first lore auditing)    | `plugin-only` | Plugin-first      | `legacy: Phase 17`                                                                                                                                                                 |
| Redis read-cache pipeline (wiki blocks, templates, asset metadata)  | `plugin-only` | Phase 16          | `legacy: Phase 16`                                                                                                                                                                 |
| Perspective-bound player journals (contradictory PC memories)     | `plugin-only` | Phase 23          | [`community-plugins/examples/player-journal`](../../community-plugins/examples/player-journal)                                                                                                                              |
| `registerEntityAction` / entity page overflow hooks               | `won't-do`    | Post-1.0          | [pre-1.0-plugin-platform.md](./plans/pre-1.0-plugin-platform.md) — revisit as strict `registerContextAction` on known menus only                                                   |
| Plugin-to-plugin service registry (`registerService` / `consumeService`) | `won't-do` | Post-1.0          | [pre-1.0-plugin-platform.md](./plans/pre-1.0-plugin-platform.md) — 1.0 pattern: domain reads + domain events                                                                      |
| Plugin resource guardrails (isolate_vm / workers)                   | `partial`     | Phase 10.5        | Worker sandbox + limits; `isolated-vm` deferred                                                                                                                                    |
| Automatic settings generation from `config-schema.json`             | `partial`         | Phase 10.5        | Inline `configSchema` + enum; local file merge; no remote URL                                                                                                                      |
| `CampaignPluginSetting.isEnabled` → PluginHost per-campaign routing | `shipped`         | Phase 10          | Install → enable model; request gate on campaign-scoped plugin routes                                                                                                              |
| API tokens user-global scope (audit + campaign scoping)             | `partial`         | Phase 10.5        | [phase_9_security](../../docs/plans/phase_9_security_f3a9ea7e.plan.md) — legacy sunset path; campaign-scoped tokens deferred                                                       |
| Registry publisher signature / trust verification                   | `open`            | —                 | [plugin_registry_activation](../../docs/plans/plugin_registry_activation_ee645924.plan.md), [campaign_registry_browse](../../docs/plans/campaign_registry_browse_5c75c7bc.plan.md) |
| Campaign managers editing `pluginRegistryUrl`                       | `open`            | —                 | [campaign_registry_browse](../../docs/plans/campaign_registry_browse_5c75c7bc.plan.md)                                                                                             |
| Full S3 storage driver                                              | `shipped`         | —                 | [asset-storage-platform.md](../plans/asset-storage-platform.md) — `@esiana/storage-s3`                                                                                             |
| Storage pointer unification (`filesystem://{key}`)                  | `open`            | post-freeze       | [asset-storage-platform.md](../plans/asset-storage-platform.md)                                                                                                                    |
| Bucket-qualified storage pointers (`s3://{bucket}/{key}`)           | `open`            | post-freeze       | [asset-storage-platform.md](../plans/asset-storage-platform.md)                                                                                                                    |
| Presigned redirect caching on `/api/assets/:id`                     | `open`            | —                 | [asset-storage-platform.md](../plans/asset-storage-platform.md)                                                                                                                    |
| Storage quotas / lifecycle policies                                 | `open`            | —                 | [asset-storage-platform.md](../plans/asset-storage-platform.md)                                                                                                                    |
| Filesystem → remote storage migration job                           | `open`            | —                 | [asset-storage-platform.md](../plans/asset-storage-platform.md)                                                                                                                    |
| Obsidian vault watcher / Foundry socket bridge                      | `plugin-only` | —                 | [plugin_ecosystem_readiness](../../docs/plans/plugin_ecosystem_readiness_80ccc931.plan.md)                                                                                         |
| Webhook delivery queue (Redis/Bull)                                 | `open`            | —                 | [plugin_ecosystem_readiness](../../docs/plans/plugin_ecosystem_readiness_80ccc931.plan.md)                                                                                         |
| Bidirectional Obsidian sync `POST .../sync/obsidian`                | `open`            | —                 | [plugin_ecosystem_readiness](../../docs/plans/plugin_ecosystem_readiness_80ccc931.plan.md)                                                                                         |
| OPDS EPUB acquisitions                                              | `open`            | —                 | [opds-wiki-feed-study.md](./plugins/opds-wiki-feed-study.md)                                                                                                                       |
| OPDS Party-visible catalog (scoped bearer)                          | `open`            | —                 | [opds-wiki-feed-study.md](./plugins/opds-wiki-feed-study.md)                                                                                                                       |
| OPDS `core:wiki:updated` cache bust subscriber                      | `open`            | —                 | [opds-wiki-feed-study.md](./plugins/opds-wiki-feed-study.md)                                                                                                                       |
| OPDS 2.0 / JSON feeds                                               | `open`            | —                 | [opds-wiki-feed-study.md](./plugins/opds-wiki-feed-study.md)                                                                                                                       |
| OPDS asset URLs in markdown → signed URLs for e-readers             | `open`            | —                 | [opds-wiki-feed-study.md](./plugins/opds-wiki-feed-study.md)                                                                                                                       |
| OPDS dedicated rate limiter if public feed abused                   | `open`            | Phase 10.5        | [opds-wiki-feed-study.md](./plugins/opds-wiki-feed-study.md)                                                                                                                       |
| `isolated-vm` CPU-bound plugin isolates (if workers insufficient)   | `open`            | Phase 10 optional | [phase_10_plugin_ecosystem](../../docs/plans/phase_10_plugin_ecosystem_12730998.plan.md)                                                                                           |


### Import, backup & data portability


| Item                                                                                                                                          | Status    | Target                         | Source                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Wizard ingest: Notion backend                                                                                                                 | `plugin-only` | —                              | [wizard_import_source_boxes](../../docs/plans/wizard_import_source_boxes_26e2a64f.plan.md) — use Obsidian Markdown ZIP path |
| Wizard ingest: OneNote backend                                                                                                                | `plugin-only` | —                              | [wizard_import_source_boxes](../../docs/plans/wizard_import_source_boxes_26e2a64f.plan.md)                                  |
| Wizard ingest: Esiana backup restore in wizard                                                                                                | `shipped` | —                              | [wizard_import_source_boxes](../../docs/plans/wizard_import_source_boxes_26e2a64f.plan.md)                                  |
| Separate wizard steps per import source                                                                                                       | `open`    | —                              | [wizard_import_source_boxes](../../docs/plans/wizard_import_source_boxes_26e2a64f.plan.md)                                  |
| Wizard automated tests                                                                                                                        | `open`    | —                              | [wizard_import_source_boxes](../../docs/plans/wizard_import_source_boxes_26e2a64f.plan.md)                                  |
| Google Docs import                                                                                                                            | `plugin-only` | —                              | [deferred-backlog.md](./deferred-backlog.md)                                                                                |
| Share links (tokenized read-only wiki/campaign surfaces)                                                                                      | `won't-do`    | —                              | Phase 5.5 deferral — campaign discoverability covers anonymous presentation; not core                                       |
| Wizard UI copy explaining 3-day import ZIP retention                                                                                          | `open`    | —                              | [import_staging_retention](../../docs/plans/import_staging_retention_3ac62f48.plan.md)                                      |
| Post-import immediate ZIP delete (vs 3-day janitor)                                                                                           | `open`    | Policy unchanged               | [import_staging_retention](../../docs/plans/import_staging_retention_3ac62f48.plan.md)                                      |
| Platform hardening — audit & standardize external fetch/download paths (SSRF, streaming limits, timeouts, redirect policy, cleanup semantics) | `partial` | post asset-upload-governance   | [asset-upload-governance.md](./plans/asset-upload-governance.md) Phase 3 — `networkFetch` + `pluginSourcePolicy` shipped for plugin manifest/registry/archive + asset URL import; DNS IP pinning deferred |


**Platform hardening scope** (Phase 3 audit baseline; migrate incrementally — do not block on full refactor):

- Pack import — [packAssetImporter.ts](../backend/src/lib/packAssetImporter.ts), [campaignImportProcessor.ts](../backend/src/lib/campaignImportProcessor.ts)
- Plugin manifest / registry / archive — migrated to [networkFetch.ts](../backend/src/lib/networkFetch.ts) + [pluginSourcePolicy.ts](../backend/src/lib/pluginSourcePolicy.ts)
- Future asset imports — instance branding (logo, favicon, OG), OIDC avatar/logo cache when scoped
- DNS rebinding / IP pinning at connect time — deferred (TOCTOU; `redirect: 'error'` + ssrfGuard reduces pivot risk)
- Standardize remaining paths on [networkFetch.ts](../backend/src/lib/networkFetch.ts) + [ssrfGuard.ts](../backend/src/lib/ssrfGuard.ts)

### Localization & community translations


| Item                                                                                     | Status    | Target | Source                                                                 |
| ---------------------------------------------------------------------------------------- | --------- | ------ | ---------------------------------------------------------------------- |
| UI locale foundation (Phases 0–3)                                                        | `shipped` | —      | [localization.md](./localization.md)                                   |
| In-repo community locale tree + starter `fr/` slice (Phase 4)                            | `shipped` | —      | [translating.md](./translating.md)                                     |
| Instance default UI locale (`ESIANA_DEFAULT_LOCALE`)                                     | `shipped` | —      | [localization.md](./localization.md)                                   |
| Hosted translation platform (Weblate / Crowdin) + automated sync                         | `open`    | —      | Deferred until active non-English contributors; architecture compatible |
| Maintainer locale completion dashboard (hosted / gating)                                 | `open`    | —      | Use `pnpm --filter frontend report:i18n` locally until then            |
| Full `fr/` (and other locale) coverage of all domain files                                | `open`    | —      | Incremental community PRs                                              |


### Recruitment & hub UX

Product guardrails and deferred lobby work: [recruitment_lobby_ux_deferred](../../docs/plans/recruitment_lobby_ux_deferred.plan.md). User-facing summary: [recruitment-lfg.md](../../docs/features/recruitment-lfg.md).


| Item                                                                                     | Status     | Target | Source                                                                                                       |
| ---------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| Party composition note — DM-authored text (P2)                                           | `open`     | —      | [recruitment_lobby_ux_deferred](../../docs/plans/recruitment_lobby_ux_deferred.plan.md)                      |
| Campaign cadence copy polish (descriptive format/length display, P3)                     | `partial`  | —      | [recruitment_lobby_ux_deferred](../../docs/plans/recruitment_lobby_ux_deferred.plan.md)                      |
| Public table fit notes / scheduling context — assistive prose only (P4)                  | `open`     | —      | [recruitment_lobby_ux_deferred](../../docs/plans/recruitment_lobby_ux_deferred.plan.md)                      |
| Campaign-level table style tags in directory search (P5)                                 | `open`     | —      | [recruitment_lobby_ux_deferred](../../docs/plans/recruitment_lobby_ux_deferred.plan.md)                      |
| Top-DM leaderboards, match scores, star ratings, public application counts               | `won't-do` | —      | [recruitment_lobby_ux_deferred](../../docs/plans/recruitment_lobby_ux_deferred.plan.md)                      |
| Evaluative overlap labels on public lobby; attendance %, retention badges, streaks       | `won't-do` | —      | [recruitment_lobby_ux_deferred](../../docs/plans/recruitment_lobby_ux_deferred.plan.md)                      |
| MMO role optimization on listings (“healer needed”, power meta)                          | `won't-do` | —      | [recruitment_lobby_ux_deferred](../../docs/plans/recruitment_lobby_ux_deferred.plan.md)                      |
| Engagement-optimization metrics as product goals (conversion, listing performance, etc.) | `won't-do` | —      | [recruitment_lobby_ux_deferred](../../docs/plans/recruitment_lobby_ux_deferred.plan.md) — internal guardrail |


### Canonical page editor


| Item                                                     | Status             | Target | Source                                                       |
| -------------------------------------------------------- | ------------------ | ------ | ------------------------------------------------------------ |
| Location/org full appearance                             | `won't-do` | P3     | [canonical-page-editor.md](./plans/canonical-page-editor.md) |
| Family/Object section appearance in Overview             | `won't-do` | P3     | [canonical-page-editor.md](./plans/canonical-page-editor.md) |
| Block split + capability gating (beyond character pilot) | `won't-do` | P3     | [canonical-page-editor.md](./plans/canonical-page-editor.md) |
| Discovery-aware appearance variants                      | `won't-do` | P3     | [canonical-page-editor.md](./plans/canonical-page-editor.md) |


### Authoring workflow


| Item                                                                                  | Status     | Target | Source                                                 |
| ------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------ |
| Additional narrative scaffolds (heist, intrigue, dungeon, survival, faction conflict) | `won't-do` | —      | [authoring-workflow.md](./plans/authoring-workflow.md) |


### Layer 5 projection chrome


| Item                                                                                       | Status     | Target | Source                                                                                |
| ------------------------------------------------------------------------------------------ | ---------- | ------ | ------------------------------------------------------------------------------------- |
| DM-only narrative metadata layer (hidden annotations, spoiler notes, unpublished branches) | `won't-do` | —      | [narrative-engine-layers.md](./plans/narrative-engine-layers.md) `legacy: Phase 15.5` |


### Mobile & viewport


| Item                                                            | Status    | Target   | Source                                                                                                              |
| --------------------------------------------------------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| Chronology calendar/timeline density on narrow viewports (V-10) | `open`    | —        | [viewport-audit.md](./viewport-audit.md)                                                                            |
| Recruitment lobby mobile full pass                              | `open`    | —        | [viewport-audit.md](./viewport-audit.md)                                                                            |
| Sidebar layout polish / optional tabbed sidebar                 | `partial` | Phase 15 | [todo.md](../todo.md) — zone IA shipped [sidebar-ia-reorder.md](./plans/sidebar-ia-reorder.md); tabbed sidebar open |


### Platform, docs & ops


| Item                                                                                    | Status     | Target                                 | Source                                                                                                              |
| --------------------------------------------------------------------------------------- | ---------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| SCIM provisioning, scheduled group reconciliation workers                               | `open`     | Post-1.0                               | Upstream IdP or later core phase                                                                                    |
| Nested group resolution, complex RBAC inheritance, org-wide sync dashboards             | `open`     | Post-1.0                               | Enterprise scope                                                                                                    |
| Fine-grained permission mapping UI for IdP groups                                       | `open`     | Post-1.0                               | JSON `groupRoleMappings` on provider row today                                                                      |
| `trustedHeadersAuth` (Caddy forward_auth, Authelia auth_request)                        | `open`     | Post-1.0                               | Proxy-terminated auth for self-hosted stack                                                                         |
| Azure group overage / `_claim_sources`                                                  | `open`     | Post-1.0                               | Solve upstream in Entra or dedicated mapper                                                                         |
| Phase 6 block (benchmark generators, capacity profiling, concurrency, base64 interceptor) | `in-todo`  | Phase 6 / post-1.0 (not Pre-1.0 gate) | [todo.md](../todo.md); API/developer docs superseded by Phase 13 items — [changelog.md](../changelog.md) Unreleased |
| Contributor setup guide                                                                 | `in-todo`  | Phase 13                               | [app_version_source_of_truth](../../docs/plans/app_version_source_of_truth_dd25daff.plan.md), [todo.md](../todo.md) |
| Automated release scripts / CI version bump                                             | `open`     | —                                      | [app_version_source_of_truth](../../docs/plans/app_version_source_of_truth_dd25daff.plan.md)                        |
| Product version stored in `SystemSetting` DB                                            | `won't-do` | —                                      | [app_version_source_of_truth](../../docs/plans/app_version_source_of_truth_dd25daff.plan.md)                        |
| Automated OpenAPI / API docs split                                                    | `partial`  | Phase 13                               | Scaffolding shipped ([changelog.md](../changelog.md)); route coverage expansion open — [todo.md](../todo.md)        |
| Database portability audit, Postgres CI parity, Postgres default, Docker multi-stage, CI CodeQL, branch protections | `shipped`  | v1.0.0 pipeline                        | [database-portability-audit.md](../docs/audits/database-portability-audit.md), [todo.md](../todo.md)                |
| Pre-1.0 narrative foundation (L1–L4)                                                    | `shipped`  | Narrative Platform                     | [changelog.md](../changelog.md); open infra gates in [todo.md](../todo.md)                                          |


### Vision / research (no single plan snapshot)

High-level ideas from [req.md](./plans/req.md) and [chat.md](./plans/chat.md). Tracked in [todo.md](../todo.md) by **Narrative Platform engine layer** (L1–L6). Plan: [narrative-engine-layers.md](./plans/narrative-engine-layers.md).


| Theme                                                       | todo.md anchor                                                                                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Continuity warnings, timeline overlay, since-last-visit     | **Shipped** Layer 1 + Layer 4 v1 — [changelog.md](../changelog.md)                                                                         |
| Downtime period timeline + entity annotations               | **Shipped** Layer 1 — [changelog.md](../changelog.md); [downtime-timeline.md](platform/downtime-timeline.md)                               |
| Fog, discovery codex, party knowledge, soft canon           | **Shipped Layer 1** — [changelog.md](../changelog.md); [lore-knowledge-extension-points.md](./platform/lore-knowledge-extension-points.md) |
| Open narrative threads, quest lifecycle                     | **Shipped Layer 2** — [changelog.md](../changelog.md)                                                                                      |
| Rumors, world drift, advance world state                    | **Shipped Layer 3** — [changelog.md](../changelog.md)                                                                                      |
| Dead-end / hidden reachability diagnostics (full L4 batch)  | **Shipped** — [changelog.md](../changelog.md)                                                                                              |
| Storyboard, investigation board, scene timelines, relations | **Shipped** Layer 5 — [changelog.md](../changelog.md) (`legacy: Phase 15.5`, Phase 20)                                                     |
| Session prep, recaps, pacing, journals                      | Layer 6 Intelligence — [todo.md](../todo.md) (`legacy: Phase 21`)                                                                          |
| Relations workspace, Social Dynamics, Structure, Kinship    | **Shipped** Layer 5 — [changelog.md](../changelog.md) (`legacy: Phase 20`)                                                                 |
| World nexus / chrono-scrubber                               | Layer 1 timeline overlay + Layer 3 geography (`legacy: Phases 19, 24`)                                                                     |
| Wiki-as-source-of-truth; visualizations as projections only | Architectural principle in req.md; post-1.0 schema policy in [todo.md](../todo.md)                                                         |
| Quest state machine, clue ledger                            | **Shipped** Layer 2 + Layer 5 — [changelog.md](../changelog.md)                                                                            |


---

## Flat index (A–Z)

Open and deferred items only (`open`, `partial`, `in-todo`) — shipped, won't-do, and plugin-only decisions stay in domain sections above.


| Item                                                 | Status  | Target phase | Primary source                     |
| ---------------------------------------------------- | ------- | ------------ | ---------------------------------- |
| @mention / page-assignment notifications             | open    | 15+          | phase_8_notifications              |
| Admin script — session author page dedupe            | open    | —            | fix_session_notes                  |
| Ambient real-time auto-linking                       | open    | 15           | document_auto-link_scan            |
| Ancestor reveal in codex hierarchy                   | open    | Post-v1      | todo.md watchpoints                |
| API tokens user-global → scoped audit                | partial | 10.5         | phase_9_security                   |
| Automated CI version bump                            | open    | —            | app_version_source_of_truth        |
| Automated OpenAPI / API docs split                   | partial | 13           | scaffolding shipped; route coverage open |
| Automatic settings generation (`config-schema.json`) | partial | 10.5         | plugin_registry_activation         |
| Azure group overage / `_claim_sources`               | open    | Post-1.0     | enterprise auth                    |
| Bidirectional Obsidian sync API                      | open    | —            | plugin_ecosystem_readiness         |
| Bucket-qualified storage pointers                    | open    | post-freeze  | asset-storage-platform           |
| Bulk auto-link preview alerts                        | open    | 15           | document_auto-link_scan            |
| Cached visual atlas manifests / invalidation         | open    | Post-v1      | Visual Atlas v1                    |
| Campaign cadence copy polish (recruitment, P3)       | partial | —            | recruitment_lobby_ux_deferred      |
| Campaign Home tabs/presets/role layouts              | open    | —            | Phase 18 campaign-home             |
| Campaign Home weather/world-state synthesis          | open    | —            | Phase 18 campaign-home             |
| Campaign link health dashboard                       | open    | —            | wiki_internal_linking              |
| Campaign managers edit pluginRegistryUrl             | open    | —            | campaign_registry_browse           |
| Campaign plugin isEnabled → PluginHost bridge        | shipped | 10           | plugin-tiers.md                    |
| Campaign Presentation logo/icon in hero              | open    | —            | Campaign Presentation follow-up    |
| Campaign Presentation recruitment preview / trailer  | open    | —            | Campaign Presentation follow-up    |
| Campaign QuickAccess data model + `/wiki/quick-access` CRUD | in-todo | v1.1+  | todo.md                            |
| Campaign-scoped theme engine                         | in-todo | 15           | todo.md                            |
| Chronology calendar/timeline density (V-10)          | open    | —            | viewport-audit.md                  |
| Chronology wiki existence deep checks                | open    | —            | chronology_layout_pivot            |
| Chronology-appended wiki timestamp badges on save    | in-todo | 15           | todo.md                            |
| Co-DM ownership-transfer info notifications          | open    | —            | phase_8_notifications              |
| Compile-hub sidebar link to snapshot                 | partial | —            | session_snapshot_unified_path      |
| Contributor setup guide                              | in-todo | 13           | todo.md                            |
| Create Location flow parent picker (deep nest)       | open    | —            | wiki_breadcrumb_hierarchy          |
| Dashboard player identity display                    | open    | —            | phase_3.5_identity_mapping         |
| Dedicated `/locations/:id` routes                    | open    | —            | wiki_breadcrumb_hierarchy          |
| Derive roster from combined `columns` (optional)     | open    | —            | session_snapshot_unified_path      |
| Entity inspector field search                        | open    | —            | entity-inspector-ux.md             |
| FC eras / seasons / weather / non-master calendars   | open    | —            | fantasy_calendar_import_fix        |
| Filesystem → remote storage migration job            | open    | —            | asset-storage-platform             |
| Fine-grained permission mapping UI for IdP groups    | open    | Post-1.0     | enterprise auth                    |
| Full-document bulk auto-link scan                    | open    | —            | global_tiptap_auto-link            |
| Homepage interactive world map                       | open    | —            | homepage_recruitment_consolidation |
| Import tag migration to relational tags              | open    | —            | wiki_tagging_system                |
| Infobox Region as wiki link                          | open    | —            | wiki_breadcrumb_hierarchy          |
| `isolated-vm` plugin isolates                        | open    | 10 optional  | phase_10_plugin_ecosystem          |
| Location settings read-only map link                 | open    | —            | maps_hub_and_settings              |
| Map dimension re-optimize admin action               | open    | —            | phase_7_spatial_mapping            |
| Marker clustering (>50 pins)                         | open    | —            | phase_7_spatial_mapping            |
| Multi-calendar temporal mapping                      | in-todo | 15           | todo.md                            |
| Nested group resolution / complex RBAC inheritance   | open    | Post-1.0     | enterprise auth                    |
| NotificationChannel registry                         | open    | 11+          | phase_10_plugin_ecosystem          |
| OPDS EPUB / Party / 2.0 / cache bust / signed assets | open    | —            | opds-wiki-feed-study.md            |
| Paragraph-level session export interleave            | open    | —            | session_snapshot_unified_path      |
| Parent→children index (codex forest optimization)    | open    | Post-v1      | todo.md watchpoints                |
| Party composition note (recruitment, P2)             | open    | —            | recruitment_lobby_ux_deferred      |
| PDF / print CSS (session snapshot)                   | open    | —            | session_snapshot_unified_path      |
| Per-author ReferencesWidget filter                   | in-todo | —            | todo.md                            |
| Per-campaign notification overrides                  | open    | —            | phase_8_notifications              |
| Per-game-system wiki presets                         | open    | Future       | [reference/gamesystems.md](../../docs/reference/gamesystems.md) |
| Per-resource ACL overrides / custom campaign roles   | open    | Post-1.0     | campaign-access-model              |
| Perspectives API → derive from columns               | open    | —            | session_snapshot_unified_path      |
| Phase 6 capacity profiling block                     | in-todo | 13           | todo.md                            |
| Platform hardening — external fetch/download audit   | open    | post-governance | asset-upload-governance         |
| Plugin registry signature verification               | open    | —            | plugin_registry_activation         |
| Plugin resource guardrails (sandbox)                 | partial | 10.5         | plugin_registry_activation         |
| Database portability + Postgres default + Docker/CI protections | shipped | v1.0.0 pipeline | [database-portability-audit.md](../docs/audits/database-portability-audit.md), todo.md |
| Post-import immediate ZIP delete                     | open    | —            | import_staging_retention           |
| Presigned redirect caching on `/api/assets/:id`      | open    | —            | asset-storage-platform             |
| Prisma DB triggers / `transformWikiContent` link sync | open   | 10           | wiki_internal_linking              |
| Public campaign presentation controls (future)     | in-todo | —            | todo.md                            |
| Public table fit notes (recruitment, P4)             | open    | —            | recruitment_lobby_ux_deferred      |
| Push notifications (mobile/PWA)                      | in-todo | 16           | phase_8_notifications              |
| Quest boardOrder rebalance job                       | open    | —            | quest-hub-kanban-ordering.md       |
| Quest list/tree column order                         | open    | —            | quest-hub-kanban-ordering.md       |
| Quick Access sidebar (DM/Co-DM campaign shortcuts)   | in-todo | v1.1+        | todo.md                            |
| Recruitment/hub thumbnails focal point + display mode | open   | —            | Hero banner modes follow-up        |
| Recruitment lobby mobile pass                        | open    | —            | viewport-audit.md                  |
| Reposition banner (drag-to-focus focal point UI)     | open    | —            | Hero banner modes                  |
| SCIM provisioning / group reconciliation workers     | open    | Post-1.0     | enterprise auth                    |
| Second query path for anthology or references        | open    | —            | session_snapshot_unified_path      |
| Session location picker deep nesting                 | open    | —            | wiki_breadcrumb_hierarchy          |
| Sidebar layout polish / optional tabbed sidebar      | partial | 15           | todo.md                            |
| Storage pointer unification (`filesystem://{key}`)   | open    | post-freeze  | asset-storage-platform             |
| Storage quotas / lifecycle policies                  | open    | —            | asset-storage-platform             |
| Table style tags in recruitment directory (P5)       | open    | —            | recruitment_lobby_ux_deferred      |
| Tag color picker UI                                  | open    | —            | wiki_tagging_system                |
| Theme FOUC / theme-init.js cache                     | open    | —            | cascading_theme_resolver           |
| TipTap Mention / `[[visible]]` nodes                 | open    | 15           | global_tiptap_auto-link            |
| `trustedHeadersAuth` (Caddy / Authelia)              | open    | Post-1.0     | enterprise auth                    |
| Webhook delivery queue (Redis/Bull)                  | open    | —            | plugin_ecosystem_readiness         |
| Wizard automated tests                               | open    | —            | wizard_import_source_boxes         |
| Wizard import ZIP retention UI copy                  | open    | —            | import_staging_retention           |
| Wizard separate steps per source                     | open    | —            | wizard_import_source_boxes         |
| `/wiki/tags` URL segment                             | open    | —            | wiki_tagging_system                |
| World hub / chrono-scrubber vision                    | open    | 17–18        | req.md, chat.md                    |


---

## Plan snapshots with no deferral items

These archived plans were reviewed; they contain no explicit out-of-scope / defer sections (implementation-complete or narrowly scoped):

`appearance_footer_favicon`, `bi-directional_wiki_references`, `chronology_date_sync`, `chronology_inline_expand_permissions`, `chronology_split_tech-tree`, `chronology_three-view_split`, `advanced_chronology_rules`, `event_inline_management`, `event_lore_description_sync`, `fantasy_event_date_picker`, `multi-day_occurrence_fix`, `migrate_cursor_history`, `opds_campaign_plugin_refactor`, `parent_picker_blacklist`, `phase_2_wiki_safeguards`, `readme_and_todo_updates`, `recruitment_marketplace_revamp`, `recruitment_page_dashboard`, `strict-multi-tenancy-refactor`, `theme_engine_rollout`, `wiki_header_layout_fix`, `wiki_metadata_grid_refine`, and others without deferral headings.

Deferrals from those efforts, if any, were captured inline above (e.g. chronology mobile → viewport audit).