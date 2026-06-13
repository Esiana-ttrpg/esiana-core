# Changelog

All notable **product** changes for Esiana are documented in this file.

Product version is defined in the root [`package.json`](./package.json) and surfaced in the admin UI and update checker. Open roadmap work is tracked in [todo.md](./todo.md) by **Narrative Platform engine layer** (`layer:1`–`layer:6`) with release-gate metadata; this changelog groups shipped work by **product domain**.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

When a change was planned before implementation, entries may link to a snapshot under [docs/plans/](./docs/plans/).

## [Unreleased]

Pre-1.0 audit work — data sovereignty, integrator docs, migration review, and production baseline scaffolding until v1.0.0 tag.

### Added

#### Pre-1.0 audit (2026-06-13)

- **Export entity matrix** — [pre-1.0-export-audit.md](docs/audits/pre-1.0-export-audit.md) with A/B/C tiers; automated harness `pre1ExportEntityMatrix.integration.test.ts`
- **Sovereign `knowledge.json`** — Lore claims + historical aliases export/restore in GM backup ZIP (`sovereign/knowledge.json`)
- **Obsidian import typing** — Folder module → `templateType` + `entityCategory` (frontmatter overrides)
- **OpenAPI + `/api/docs`** — Manual OpenAPI 3.1 spec with examples; Swagger UI (disabled in production unless `OPENAPI_DOCS_ENABLED=true`)
- **Migration audit** — [migration-audit.md](docs/audits/migration-audit.md); **78→1 baseline squash** archived at [migration-history/pre-v1-squash-20260613](docs/migrations/migration-history/pre-v1-squash-20260613/) — [verification report](docs/audits/migration-squash-verification-20260613.md)
- **Docker Compose baseline** — `docker-compose.yml`, Dockerfiles, [self-hosting-runbook.md](docs/deployment/self-hosting-runbook.md)
- **Docker Phase 11 polish** — `.dockerignore`, targeted Dockerfile COPY layers, profile-free Postgres compose, backend healthcheck + frontend startup ordering, migrate retry in entrypoint, CI `docker-build` job, self-hosting doc alignment
- **Prisma transaction audit** — `DbClient` / `withDbTransaction` module; nested-tx fix in world-development auto-apply during global time hooks; tx-aware chronology/ledger/rumor helpers — [prisma-transaction-audit.md](docs/audits/prisma-transaction-audit.md)
- **Narrative foundation sign-off** — [narrative-foundation-signoff.md](docs/audits/narrative-foundation-signoff.md)
- **RC checklist** — [pre-1.0-rc-checklist.md](docs/release/pre-1.0-rc-checklist.md)

#### Documentation split (2026-06-13)

- **Two-layer docs model** — Version-locked `/api/docs` + `openapi/openapi.yaml` in core; human guides in docs wiki (`architecture/`, `api/`, `plugin-development/`, `self-hosting/`); maintainer records in `esiana-core/docs/` (`audits/`, `architecture-internal/`). Entry point: [campaign-model.md](../docs/architecture/campaign-model.md)
- **Plugin developer quickstart** — [docs/plugin-development/getting-started.md](../docs/plugin-development/getting-started.md); hello-world in [example-plugin](../community-plugins/example-plugin/README.md)
- **Self-hosting guides** — [docs/self-hosting/installation.md](../docs/self-hosting/installation.md); Docker openapi packaging fix in backend image

Post-0.9.0 work — downtime Phase 8 remainder, asset platform, and content-pack fixes until the next version tag.

### Security

- **Pre-1.0 tenant isolation refresh** — Staging export ZIPs gated on generic asset routes; `expiresAt` enforced (410); non-map assets require membership; wiki-lore mutations require `page.edit_any`; GM-only player session summaries and world-development history; campaign-scoped plugin HTTP jail; extended `CAMPAIGN_SCOPED_MODELS` and scoped `updateMany`/`deleteMany` mutations. Docs: [tenant-isolation-audit.md](docs/security/tenant-isolation-audit.md).

### Fixed

- **Content pack import parent ordering** — Pages with `parentKey: slug:…` (e.g. nested quest objectives) now import before their children, fixing silent bootstrap failures that left campaigns with skeleton wiki only.
- **Content pack party participation** — GbM generator no longer double-encodes JSON frontmatter (`partyParticipation`, `havenFields`, etc.); importer coerces legacy escaped JSON strings so `/party` ensemble roster populates after import.

### Added

#### Downtime simulation — Phase 8 (post-0.9.0)

- **Scheduled effects (v1.1)** — Narrative schedules in Progression › Scheduled Effects (`world_development_prompt`, `haven_threat_prompt`); API `scope` filter; occurrence audit table with `fired`/`suppressed` outcomes; treasury v1 unchanged. Docs: [scheduled-effects.md](docs/architecture-internal/scheduled-effects.md).
- **World Development (optional)** — Trajectory-driven suggestion pool (Off / Manual / Assisted / Auto Apply), activity budget, type lifecycles, Progression › Pending Developments. Docs: [world-development.md](docs/architecture-internal/world-development.md).
- **Downtime resolution wizard** — Guided between-sessions ritual under Progression › Advance Time (time → projects → havens → developments → consequences). Component: [AdvanceTimeSection.tsx](frontend/src/components/progression/AdvanceTimeSection.tsx).

#### Asset platform & content packs

- **Asset storage platform** — Storage registry with degraded boot, `@esiana/storage-s3` infrastructure package, pointer-owned routing (`s3://` / `/uploads/`), Admin Storage health + bounded metrics. Plan: [asset-storage-platform.md](docs/plans/asset-storage-platform.md).
- **Asset upload governance (Phase 1)** — `assetIngest` / `assetImport`, URL import with SSRF guard, Admin Assets & Uploads + Storage pages, `ImportImageUrlField` on primary image surfaces. Plan: [asset-upload-governance.md](docs/plans/asset-upload-governance.md).
- **Asset upload governance (Phase 2)** — Structured image fields (`/api/assets/{id}` only) with save-path rejection; `importFromPack` routes pack/ZIP/backup images through `assetIngest`; structured render cleanup; `ImportImageUrlField` on remaining codex surfaces. Plan: [asset-upload-governance.md](docs/plans/asset-upload-governance.md).
- **Content Pack Format v1 (Phase 2B)** — Generic `pageMetadataRoundTrip` for all `wikiPage.metadata` fields; `campaign.json` shell import; optional `knowledge.json` (lore claims + historical aliases); satellite bootstrap for havens, projects, and `mapAssetId`; slug/asset ref resolution in pack import. Docs: [sample-data-generator.md](docs/architecture-internal/sample-data-generator.md), [content-pack-audits.md](docs/audits/content-pack-audits.md), [gbm-ui-walkthrough.md](docs/architecture-internal/gbm-ui-walkthrough.md).
- **Demo content packs** — `girl-by-moonlight-one-shot` (flagship), `daggerheart-demo`, `starfinder-demo` in `community-plugins/demo-content-packs`. Tomb and player-experience packs frozen for regression.

#### Data portability

- **Sovereign backup operational layer** — `sovereign/operational.json` in campaign ZIP exports downtime haven/project satellite rows, `PluginData`, and plugin settings; restore replays them with `bootstrapPackSatelliteRows` fallback for older archives
- **In-campaign backup restore** — Campaign Settings → Data & backup → Upload backup ZIP (`POST /api/campaigns/:handle/backup/restore`)
- **Import wizard cleanup** — Removed inert OneNote and Notion placeholder cards; Obsidian Markdown ZIP and Esiana backup remain
- **Portability documentation** — [data-backup-and-export.md](../docs/features/data-backup-and-export.md) documents three tiers (lore sovereign / wiki-linked operational / full clone) and falsification test steps

## [0.9.0] - 2026-06-12

Beta milestone — Narrative Platform foundation (Layers 1–5), downtime simulation, campaign ACL, canonical page editor, and Campaign Hub revamp.

### Removed

- **Page Templates / Template Studio** — Removed campaign and system-admin template studios, `CampaignTemplate` persistence, layout preset picker at page creation, and related APIs. New wiki pages use built-in default blocks per entity type (`CHARACTER`, `LOCATION`, etc.). Legacy backup zips may still contain `sovereign/templates/` entries; they are ignored on restore.

### Added

- **Core Sample Data Generator (Phase 2)** — Real `importContentPack()` orchestrator (`markdownPackImporter`, assets, `calendar.json` → Fantasy Calendar import, optional `relations.json`); importable-content gate; `contentPackOrigin.pluginVersion` diagnostics snapshot; `demo-content-packs` community plugin with tomb and player-experience markdown conversions; legacy `campaignGenerator` retired with `presetId` → content pack / sample data shim. Docs: [sample-data-generator.md](docs/architecture-internal/sample-data-generator.md).

- **Core Sample Data Generator (Phase 1)** — Ports campaign-seeder engine into `backend/src/lib/sampleData/` with four env-gated dev profiles (`ENABLE_SAMPLE_DATA`); Create Campaign wizard splits **Content Packs** (plugin markdown, always on) and **Sample Data** (dev fixtures); `GET /api/content-packs`, `GET /api/sample-data/profiles`, Admin → Sample Data generate tool; `contentPack` manifest capability + origin metadata on campaigns. Docs: [sample-data-generator.md](docs/architecture-internal/sample-data-generator.md).

- **Campaign ACL migration (Phases A–E)** — Four-layer access model (administration, authority, ownership, visibility); `Party` + page ownership schema; `page.*` capabilities; Observer write lockdown; `canEditPage` + semantic `editBlock` API; `CampaignRoleCapabilityOverride` + collaboration settings UI; `useCampaignPolicy` wired at WikiPage root; universal `VisibilityTierChip` on quest hub. Audit: [capability-migration-audit.md](docs/architecture-internal/capability-migration-audit.md).

- **Campaign capability inventory (pre-ACL baseline)** — Policy vs enforcement matrix for GM, Writer, Participant, and Observer; open Participant decisions and drift hotspots documented before Phase 2 ACL wiring. See [capability-inventory.md](docs/architecture-internal/capability-inventory.md).

#### Downtime simulation — Phase 8 Scheduled effects (treasury v1)

- **Scheduled effects infrastructure** — `CampaignScheduledEffect` model with anchor + fire cursors, duration and calendar-month recurrence, and optional `effectPayload` for future sinks. `upkeep-v1` global time hook emits `CampaignLedgerSuggestion` rows (`sourceType: scheduled_effect`) on time advance — Schedule → Suggestion → Human approval; no silent treasury mutation. Cap: 24 fires per advance with operational hook receipt diagnostics. API: `/downtime/scheduled-effects` CRUD. UI: Downtime › Ledger scheduled treasury panel; haven manage shortcut prefills recurring upkeep. Downtime pulse shows active schedule count + next due hint. Docs: [scheduled-effects.md](docs/architecture-internal/scheduled-effects.md)

#### Downtime simulation — Phase 7 Adventure integration

- **Quest time simulation** — Authored deadlines, offscreen progress clocks (PASSIVE/STEADY/AGGRESSIVE posture), and ignored-quest escalation tiers on quest wiki metadata (`questTime.rules` / `questTime.state`). Runs on `cooldown_expiry` global time hook with detect/apply signal pipeline; hybrid expiry (auto-fail optional, GM resolve/dismiss/extend); canonical `touchQuestTimeline()` for party engagement. Surfaces: Adventure quest badges, Downtime `quest_time` feed cards. Docs: [quest-time-simulation.md](docs/architecture-internal/quest-time-simulation.md)
- **Continuity integration** — Layer 4 diagnostics (warning+), escalating haven threats, and stalled projects normalize into Downtime overview `DowntimeFeedCard` pressure via `loadDowntimePressurePresentation()`; explicit pulse counts (`continuityPressureCount`, `havenThreatCount`, `stalledProjectCount`, `creativeDriftActiveCount`). Haven threat auto-escalation on `haven_updates` (`low`→`rising` after 14 days, `rising`→`critical` after 7 days; one tier per pass). Project stall pressure is feed-only. Modules: [`shared/downtimeContinuityIntegration.ts`](shared/downtimeContinuityIntegration.ts), [`backend/src/lib/loadDowntimePressurePresentation.ts`](backend/src/lib/loadDowntimePressurePresentation.ts), [`backend/src/lib/havenThreatEscalationService.ts`](backend/src/lib/havenThreatEscalationService.ts)

#### Layer 5 — Narrative Workspace (Organization shell)

- **OrganizationPageShell** — Institutional power surfaces replacing generic Lore + Structure workspace for organizations: guiding doctrine (*how power moves through the world*), restrained Overview (Current Pressures, Why Now, teaser links), tabs Overview / Structure / Presence / Relations / People / Lore / Continuity (DM). Metadata: `worldState`, `currentPressures`, public/private duality, presence location lists, `influenceMode`, `organizationalVisibility`, symbol preset + doctrine tint, `structuralRole` for sub-orgs. **OrganizationHubView** with hierarchy / world-state / region browse and party reputation bands on cards. Docs: [future-shells.md](frontend/src/lib/entityPageShells/future-shells.md)

#### Recruitment & hub

- **Campaign Hub revamp** — Global home (`/`) reframed as a thematic continuity system: **Resume Your Story** hero rail (up to 4 campaigns), tiered **Needs Attention** queue from batched campaign signals, unified **Your Campaigns** library with shelf-density modes, **On the Hearth** condensed cards for hero campaigns, campaign pinning (`UserCampaignPin`), and whisper-tier attention dismiss/snooze. Extended `GET /api/user/hub` with `resumeHero`, `attentionQueue`, `upcomingChips`, `recentEdits`, `arcIdentity`, and momentum. LFG demoted to **Explore** nav link (`/recruitment`). Optional `dashboardConfig.hero.currentArc` for hub arc identity.

#### Layer 5 — Narrative Workspace (Codex appearance)

Plan: [canonical-page-editor.md](docs/plans/canonical-page-editor.md).

- **Appearance forms / details refinement (P3)** — Corrected player-facing naming: **Forms** = presentation-state overlays (`appearance.gallery` — variants, transformations, disguises); **Details** = baseline observable characterization (voice, build, vibe, features, at-a-glance). Gallery entry `notes` renamed to `presentationNotes` (legacy `notes` read on parse). Added `corrupted` `presentationType`. Capability remap: `gallery` → `forms`, descriptor `forms` → `details`; `supportsAppearanceDetails`. Disguise identity masking documented as projection concern. Shared schema in `shared/appearanceMetadata.ts`; `resolvePrimaryGalleryEntry()` for projection; legacy `portraitUrl` shim until forms edited.

#### Layer 5 — Narrative Workspace

Plan: [narrative-engine-layers.md](docs/plans/narrative-engine-layers.md).

- **Scene entity type (`Type: Scene`)** — Wiki-canonical narrative scene pages with `scene-metadata-v1` (summaries, participants, locations, entry/exit conditions, typed outcomes, pacing tags, linked quests/clues, GM-only notes), `templateType: SCENE`, codex type resolution, inspector surface profile, full orchestration editor, and party-safe `gmNotes` projection on wiki GET. Docs: [narrative-scenes.md](docs/architecture-internal/narrative-scenes.md)
- **Narrative beat annotations** — Shared dramatic-beat catalog (`shared/narrativeBeatTypes.ts`) with human labels, structural GM hints, and four role groups (setup / escalation / pivot / resolution). Beat-first scan layout on Adventure scene lists and storyboard nodes; group-based muted chip styling (structural role only — not emotional tone; `tone` stays separate). Storyboard beat filter persists via layout PATCH; optional dramatic pacing panel for GMs. Docs: [narrative-scenes.md](docs/architecture-internal/narrative-scenes.md)
- **Arc hierarchy system** — Wiki-canonical objectives as quest child pages; phased `buildArcHierarchyProjection` (campaign arc → questline → quest → objective + scene associations); Arcs tree UI; arc/objective authoring widgets; storyboard `collapseByArc` filter. Docs: [adventure.md](docs/architecture-internal/adventure.md), [narrative-objectives.md](docs/architecture-internal/narrative-objectives.md)
- **Storyboard-as-view architecture** — Layout-only `storyboard-view-v1` chrome over wiki-canonical entities; semantic edges derived from entity graph with explainable provenance (`relationKind`, `derivationSource`, `explanation`); scene sequence edits write `followsScenePageIds`; stale layout node pruning on PATCH. Docs: [narrative-storyboard.md](docs/architecture-internal/narrative-storyboard.md)
- **Narrative storyboard workspace** — Multi-entity React Flow canvas (scenes, quests, threads, characters, locations, events); entity palette; act swimlanes; topology modes (`arc_flow`, `investigation`, `session_prep`, `continuity`); edge inspector and mode legend. Docs: [narrative-storyboard.md](docs/architecture-internal/narrative-storyboard.md)
- **Storyboard presets** — Non-destructive campaign scaffolds (three-act campaign, mystery investigation, five-beat session) applying lanes + `activeMode` only. Docs: [narrative-storyboard.md](docs/architecture-internal/narrative-storyboard.md)
- **Clue & lead dependency ledger** — Read-only investigation matrix in Adventure › Investigation linking clues, leads, discoveries, NPCs, scenes, and unlocked locations from wiki metadata; explainable edge provenance; SPOF / reachability overlays. Docs: [narrative-investigation-ledger.md](docs/architecture-internal/narrative-investigation-ledger.md)
- **Scene timeline view** — Adventure › Scene Timeline session-column board with drag-drop `plannedSessionId` / `sortOrder` planning; derived `blockingSceneIds` and `sessionConfidence` visual language; sequence list from `followsScenePageIds`; planned/played session pickers on scene editor. Docs: [scene-timeline.md](docs/architecture-internal/scene-timeline.md)
- **Story thread history view** — Adventure › Thread History per-thread milestone timeline (Setup → Reminder → Payoff → Resolution) with distinct climactic/terminal styling, session-gap copy, `visualEmphasis` card tiers, and Layer 4 diagnostic overlays; GM-only read-only projection from foreshadowing chains. Docs: [story-thread-history.md](docs/architecture-internal/story-thread-history.md)
- **Relations workspace (world dynamics)** — Campaign `/relations` lens workspace with progressive disclosure (Overview → Explore faction → Connections), server-precomputed projections (`GET /entity-graph/projection`), Current Situation narrative bullets, global render guardrails (admin defaults 50 nodes / 80 edges), timeline date scrub, and three lenses: **Social Dynamics** (Blocs, Reputation, Conflicts, Connections, Influence stub), **Structure & Hierarchy** (React Flow command chain + institutional org map), **Kinship & Legacy** (generation-lane layout + succession highlight). Optional character social links authoring; inferred `shared_faction` ties; entity deep-links from codex widgets. Docs: [entity-graph.md](docs/architecture-internal/entity-graph.md)

#### Layer 5 — Narrative Workspace (authoring workflow)

Plan: [authoring-workflow.md](docs/plans/authoring-workflow.md).

- **Editor instrumentation (Tier 1)** — `useEditorInstrumentation` on all Tiptap surfaces; word delta, session duration, entity link counts; `CampaignActivity` flush on blur/save; optional break reminders (localStorage)
- **Progression › Workshop** — Hidden `_Workshop Drafts` wiki-backed drafts (`workshopDocument.ts`); autosave; **Formalize** → minimal canonical shells
- **Progression › Insights** — Campaign growth metrics (NPCs, threads, scenes, factions, quests); arc tree progress chips; narrative scaffold starters (mystery / three-act / session) creating Workshop drafts

#### Layer 4 — Diagnostics & integrity

Plan: [narrative-engine-layers.md](docs/plans/narrative-engine-layers.md).

- **Continuity warnings v1** — Deterministic temporal contradiction detection: posthumous character wikilinks in dated session notes / event lore; dissolved-organization references after `statusEffectiveDate`. Org lifecycle metadata (`organizationStatus`, `statusEffectiveDate`, `statusReason`). DM-only via existing Codex Continuity panel and continuity summary API. Docs: [continuity-warnings.md](docs/architecture-internal/continuity-warnings.md)
- **Dead-end narrative detection** — Deterministic narrative structure linting on quest and open-thread subjects: branch dead-ends, unreachable conclusions, broken consequence chains, soft/escalated unresolved thread payoffs. Draft-tolerant severity, explicit `entryNodeIds` branch metadata support. Surfaces via Codex Continuity panel and World maintenance. Docs: [narrative-dead-end-detection.md](docs/architecture-internal/narrative-dead-end-detection.md)
- **Hidden content reachability** — Activation-path linting for `HIDDEN` branch nodes on quest/open-thread subjects: BFS from `OUTCOME` entry roots with static condition satisfiability and live `graph_edge` checks (integrity, provenance freshness, temporal bounds). Surfaces via Codex Continuity panel and World maintenance. Docs: [narrative-hidden-reachability.md](docs/architecture-internal/narrative-hidden-reachability.md)
- **Circular dependency detection** — SCC-based cycle linting for branch graph loops, cross-subject unlock dependency clusters (lifecycle conditions, consequence discover chains), and calendar prerequisite cycles; canonical cycle fingerprints, participant link UI, capped at 50 findings. Docs: [narrative-circular-dependency.md](docs/architecture-internal/narrative-circular-dependency.md)
- **Orphaned content analysis** — Tiered isolation diagnostics (structural / narrative / temporal): multi-condition structural isolation, weighted connectivity for NPC disconnection, quest/thread/faction rules; unified into continuity summary with priority-aware truncation. Docs: [narrative-orphan-analysis.md](docs/architecture-internal/narrative-orphan-analysis.md)
- **Clue redundancy analysis** — Independently satisfiable path checks and articulation-point bottleneck detection on quest/thread branch graphs. Docs: [narrative-clue-redundancy.md](docs/architecture-internal/narrative-clue-redundancy.md)
- **Foreshadowing & payoff tracker** — `ForeshadowingStage` state machine from thread session metadata; progression issues and `foreshadowingChains` DTO on continuity summary. Docs: [narrative-foreshadowing-tracker.md](docs/architecture-internal/narrative-foreshadowing-tracker.md)
- **Narrative density metrics** — Authored vs world-state complexity split, `narrativeClusterComplexity` heuristic, threshold warnings. Docs: [narrative-density-metrics.md](docs/architecture-internal/narrative-density-metrics.md)

#### Layer 3 — Living world

Plan: [downtime-havens-ledger.md](docs/plans/downtime-havens-ledger.md) (downtime reputation, world events).

- **Downtime reputation (Phase 5)** — Party-to-faction trust/notoriety simulation on `reputation_shifts` hook; hybrid auto drift + GM-reviewed band crossings and investigations; project `reputation_effect` outcomes; Downtime › Reputation feed and pending suggestions panel. Docs: [downtime-reputation.md](docs/architecture-internal/downtime-reputation.md)
- **Faction momentum & era trajectories (Phase 6)** — Progression › Trajectories workspace; `CampaignMomentum` eras; org era trajectories; advisory `WorldPressureProjection`. Docs: [faction-momentum.md](docs/architecture-internal/faction-momentum.md)
- **World event suggestions from pressure (Phase 6)** — `CampaignWorldEventSuggestion` + `event_generation` global time hook; accept/dismiss in Downtime › World Events
- **Dashboard world-pressure forecast (Phase 6)** — `worldPressurePreview` on role-aware dashboard summary
- **Campaign pacing controls (Phase 6)** — `worldPressurePaused` toggle; preview/rewind receipts on time advance
- **World event feed UI (Phase 6)** — Downtime › World Events chronological narrative feed
- **Event consequences (Phase 6)** — GM-authored `event-consequence-v1` on event-lore pages; manual apply/preview (`quest_hook`, `alter_location`, `route_change`, `haven_threat`). Docs: [event-consequences.md](docs/architecture-internal/event-consequences.md)
- **Rumor engine** — Immutable `RumorCirculation` edges, chronology-backed spread/retract, region and faction gossip feeds with contested perspectives, `circulate_rumor` consequence, snapshot party-knowledge collector v2. Docs: [rumor-engine.md](docs/architecture-internal/rumor-engine.md)
- **Lore claim circulation (inspector)** — Manager-only **Circulate…** and chronology history on Sources & provenance claims; `SpreadRumorModal` target picker from claim inspector; circulation vs retraction edge badges in history table. Surfaces: Discovery subview, Codex rail **Sources & provenance**, and lore header section for managers
- **Creative drift tracking** — Heuristic scan for dormant plotlines, cooling entities, hanging promises, and reawakened threads; GM disposition map; dashboard and world-maintenance surfaces. Module: [`shared/creativeDrift.ts`](shared/creativeDrift.ts)
- **Territorial / political borders by era (authoring v1)** — `MapLayerKind` / `MapObjectSemanticRole` in `shared/mapOverlayTypes.ts`; temporal panel (visible from/until, sparse keyframes, record-at-date → `geometryOverride` only); Political borders layer template; org link on regions; `FACTION_CONTROL` chronology collector; consequence `set_faction_stance` territory suggestions (no auto-geometry). Docs: [map-border-overlays.md](docs/architecture-internal/map-border-overlays.md)
- **Migration, trade/travel routes, climate bands (v1)** — Persisted `MapSceneObject` projections with `overlayTemporal` (`generatedAtEpoch` vs `representsEpoch`), `derivationStatus`, DRAFT→REVEALED GM confirm; path spines persisted, ribbon corridors client-derived; world advance hooks (`displacement`, `economic_signal`, travel events); climate refresh on scene load from calendar month `climateAspect`; optional snapshot NPC-move migration hook; Path draw tool for manual override. Docs: [map-flow-overlays.md](docs/architecture-internal/map-flow-overlays.md), [map-weather-overlays.md](docs/architecture-internal/map-weather-overlays.md)
- **Historical map states (era presets v1)** — `MapPresentationPreset` epoch shortcuts with optional default layer toggles; scene GET returns `presentationPresets[]` + `activePresentationPresetAnchorEpoch` (anchor aid only); chronology bar era chips
- **Dynamic vector map masking (v1)** — `style.isVisibilityZone` regions linked to wiki pages; party fog via `hiddenZoneGeometries` when `!(wikiVisible && discovered)`; `getHiddenZonesForViewer()` in `mapSceneService.ts`; Leaflet fog overlay + knowledge fog toggle
- **World advance batch** — `POST/GET /world-state/*` preview/apply with `world-advance-v1` CalendarEvent audit, `WorldAdvanceReceipt` idempotency, optional bundled clock advance; six domain effects (faction org-relation events, territorial pressure, economic/conflict signals, seasonal context, NPC `locationHistory`); derived condition surfaces; batch narrative synthesis; GM UI at `/c/:slug/world-advance`. Docs: [world-advance.md](docs/architecture-internal/world-advance.md)

#### Layer 2 — Narrative State Engine

- **Narrative thread authoring & visualization** — Lifecycle-authoritative / status-descriptive matrix; session anchors (`lastAdvancedSessionId`, `resolvedSessionId`); `entity-thread-properties` wiki block and `thread` surface profile; Threads Hub split (authored vs player theories) with kind grouping, filters, GM preview, and elevated signals/warnings; dashboard `threadBundle` (living / theories / recently resolved). Docs: [narrative-threads.md](docs/architecture-internal/narrative-threads.md), [narrative-lifecycle.md](docs/architecture-internal/narrative-lifecycle.md)
- **Create Thread wizard** — Multi-step classification at creation (fixed five kinds, `narrativeWeight` minor/major/critical); atomic POST bootstrap; contextual “Track narrative thread” from entity wiki pages. Module: [`shared/threadCreate.ts`](shared/threadCreate.ts)
- **Quest lifecycle orchestration** — `NarrativeLifecycleState` table with enforced transitions (`LOCKED` → `DISCOVERED` → `ACTIVE` → `COMPLETED` / `FAILED`); GM-only visibility for locked quests; published `questStatus` synced on transition; Quest Hub, dashboard ledger, and milestone snapshots project party vs elevated views. Docs: [narrative-lifecycle.md](docs/architecture-internal/narrative-lifecycle.md)
- **Lifecycle API** — `GET/PATCH /narrative-lifecycle`, elevated `POST .../rebuild`; Kanban `questStatus` PATCH routes through transition validation
- **Open narrative threads** — `narrative_threads` wiki category, `thread-metadata-v1`, `open_thread` lifecycle sync, `THREAD_RELATED` / `THREAD_PAYOFF` graph edges, Threads Hub API, Living Threads dashboard widget. Docs: [narrative-threads.md](docs/architecture-internal/narrative-threads.md)
- **Branching** — Sparse authored `narrative-branch-v1` graphs in wiki metadata + `NarrativeBranchState` runtime pointer; `GET/PATCH /narrative-branches/:subjectId`
- **Consequence engine v1** — Declarative `narrative-consequence-rules` with idempotent `NarrativeConsequenceReceipt`; fires on lifecycle / branch transitions
- **Quest publication** — `POST/GET /narrative-publish/quest/:pageId` sanitizes DM blocks and publishes (`LOCKED` → `DISCOVERED`)
- **Published narrative projection** — `projectPublishedNarrative` in `shared/narrativeProjection.ts`; Threads Hub uses unified hub projection helper

#### Layer 1 — Canon & temporal infrastructure

Plan: [downtime-havens-ledger.md](docs/plans/downtime-havens-ledger.md) (global time hooks, downtime projects, time advancement).

- **`EntityRelation` derived graph** — Normalized edges synced from `WikiLink`, wiki metadata, calendar prerequisites, and map pin targets; undirected location pairs double-written; transactional sync on save/delete
- **Graph query runtimes** — Local SQL-first neighborhood API (`GET /entity-graph`) and full-campaign diagnostics snapshot (`GET /entity-graph/diagnostics`); batched node hydration; repair via `POST /entity-graph/rebuild` and `rebuild-entity-relations.ts`
- **Frontend** — `EntityRelationshipsWidget` uses server graph neighborhood with client fallback. Docs: [entity-graph.md](docs/architecture-internal/entity-graph.md)
- **Since last visit v1** — Canonical `PartyRegionVisit` + dual `NarrativeStateSnapshot` payloads (DM/party); region collectors (NPC presence, org stance, map presence, party knowledge rumors, danger); formulaic diff with audience-split version warnings; location codex panel. Docs: [temporal-snapshots.md](docs/architecture-internal/temporal-snapshots.md)
- **Visit suggestions** — Session/chronicle-derived signals with promote/dismiss (never diff baseline)
- **Async snapshot compression** — Post-commit hot→cold worker; visits never deleted
- **Milestone snapshots + compare API** — `POST/GET /narrative-snapshots`, `GET .../compare`
- **Location metadata** — optional `regionKey`, `regionPageId`, `dangerLevel` for snapshot scope
- **Global time hooks (Phase 1 spine)** — Synchronous `runGlobalTimeHooks` orchestrator on clock advance (`time-tracking` and world-advance paths); ordered canonical hook registry with Phase 1 stubs; `TimeAdvanceSimulationRun` audit receipts; recursion guard; `advanceMagnitude` buckets; hybrid model (transactional simulation + async `CALENDAR_ADVANCED` observability). Docs: [global-time-hooks.md](docs/architecture-internal/global-time-hooks.md)
- **Downtime project data model (Phase 2)** — Hybrid `DowntimeProject` simulation table linked 1:1 to wiki pages under `Downtime › Projects`; `downtime-project-v1` contracts (status lifecycle incl. `SUSPENDED`, resource `sourceKind`, priority, epoch-minute duration); CRUD API; downtime hub project summaries; archive-not-delete after `ACTIVE`. Docs: [downtime-projects.md](docs/architecture-internal/downtime-projects.md)
- **Downtime projects Phase 2 (progression, outcomes, UI)** — `stalledDurationMinutes` accumulation; `project_progression` hook (`project-progression-v1`); idempotent outcome executor (unlock, alter_location append-only, generate_event, reputation; haven deferred); Downtime hub narrative operation cards (prose-first, subtle progress). Docs: [downtime-projects.md](docs/architecture-internal/downtime-projects.md)
- **Time advancement v1 extensions** — Unified `computeNextEpochMinute` for all advance paths; `weeks` (duration) and `months` (calendar-relative on master fantasy calendar) units; `CalendarShiftResult` with day clamping and time-of-day preservation; `actualMinuteDelta` in hook/DTO context; calendar widget + world advance UI; GM session prompt ("How much time passed?") on new session and end session. Docs: [time-advancement.md](docs/architecture-internal/time-advancement.md)
- **Downtime period timeline projection (Phase 7)** — Derived `downtime_period` convergence entries from session epoch gaps; Chronology Hub campaign feed + Adventure › Timeline default domain; Downtime Hub `currentDowntimePeriod` card. Docs: [downtime-timeline.md](docs/architecture-internal/downtime-timeline.md)
- **Downtime entity annotations (Phase 7)** — Ephemeral character presence + location mention derivation; optional GM `downtimeGapOverlays`; inline **Affected** list on period rows. Docs: [downtime-timeline.md](docs/architecture-internal/downtime-timeline.md)

#### Narrative Platform — Temporal runtime (Layer 1A)

Esiana models **canonical narrative time** — campaign-scoped in-world runtime, not productivity scheduling. User guide: [docs/features/chronology-and-calendars.md](../docs/features/chronology-and-calendars.md).

- **Canonical world clock** — `currentEpochMinute`, master epoch, multi-calendar sync, advance-time API
- **Temporal transformation engine** — Epoch ↔ calendar conversion (`timeEngine`); leap/intercalary months; moon phases and seasons
- **Event projection & causality graph** — `CalendarEvent` model; server-side occurrence expansion; prerequisite graph; aggregate `GET .../chronology/timeline` API
- **Temporal UI runtime** — Chronology Hub (calendar grid, tech-tree matrix, events ledger); dashboard chronometer/calendar widgets; map chronology bar (“View at date”)
- **Temporal revelation projection** — `timeline_event` content presence; aggregate timeline filtering; bulk reveal
- **Temporal lore integration** — Event-linked wiki pages (`event-{id}`); `ChronologyDateFields`; campaign-present anchoring; chronology-aware aliases/provenance
- **Operational semantics** — Role-gated management; fantasy-calendar JSON import/export
- **Session chronicle (distinct domain)** — `CampaignSessionTimeline` + Master Chronicle Index = authored session memory, separate from `CalendarEvent` world chronology

#### Narrative Platform — Knowledge & Revelation

Plan: [knowledge-architecture.md](docs/plans/knowledge-architecture.md), [phase-23-discovery-knowledge.md](docs/plans/phase-23-discovery-knowledge.md). Extension points: [lore-knowledge-extension-points.md](docs/architecture-internal/lore-knowledge-extension-points.md).

- **Entity historical aliases** — Temporal display names on lore entities (e.g. “Ash Kingdom” formerly “Third Ember Dynasty”)
- **Soft canon / disputed truth** — Myth, propaganda, unreliable narrator, and region-specific truth flags on lore entries
- **Lore citation provenance** — Claims linked to source types (journal, NPC testimony, event record, artifact) beyond wiki backlinks
- **Discovery codex v1** — Players unlock species, locations, factions, maps, and languages via revelation (builds on fog + map presence)
- **Knowledge & revelation states** — Known, suspected, confirmed, disproven, and undiscovered per subject (foundation for party vs canon)
- **Party knowledge layer** — “What the party believes” distinct from GM canon truth
- **Fog of war (cross-system)** — Wiki + timeline revelation parity; block-level fog; shared reveal workflows
- **Map revelation** — Per-scene-object `revelation`, batch reveal, linked-target stripping, wiki visibility impact warning. Plan: [map-presence-visibility.md](docs/plans/map-presence-visibility.md)

#### Canonical page editor (v0.9 stabilization)

Plan: [canonical-page-editor.md](docs/plans/canonical-page-editor.md).

- **Block-scoped continuity** — Per-block wikilink scan populates `ContinuityIssue.blockId` for broken/unresolved links; Codex Continuity panel **Jump to block** scrolls to `data-codex-block-id`. Module: [`wikiContinuityBlocks.ts`](backend/src/lib/wikiContinuityBlocks.ts). Plan: [canonical-page-editor.md](docs/plans/canonical-page-editor.md)
- **Semantic index hooks (substrate)** — Per-block adapter registry with central normalization (`semanticIndexText`, `semanticKeywords`, `semanticReferences`); typed `SemanticBlockType` exhaustiveness; `getBlockSemanticIndex` / `buildPageSemanticIndex` aggregation API; no search consumer wired yet. Module: [`frontend/src/lib/blockSemanticIndex/`](frontend/src/lib/blockSemanticIndex/). Plan: [canonical-page-editor.md](docs/plans/canonical-page-editor.md)
- **Inline relationship linking UX** — Shared `wikiReferenceInsertion` pipeline (`[[` + `/` triggers → canonical `wikiLink` nodes); narrative-first `/` menu (recent entities + codex filter); `EntityRelationChip` pills in Relationships read mode and SocialLinks edit mode; narrative backlink hover preview (`contextSnippet` + breadcrumb-first popover); wikiLink keyboard semantics (Backspace atom delete, Enter navigate, Escape dismiss)
- **Linking UX hardening (v0.9)** — Lazy backlink mention snippets (`GET …/mention-snippet` on hover; lightweight backlinks list); tiered `/` cold-start fallback (recent → on-page links → pins → frequently referenced); mobile touch rules (tap-to-select, second-tap navigate, long-press actions, two-step backspace); documented `data-stub` serialization + stub resolve popover (search existing, link, wiki-tree create, leave unresolved); wikiLink keyboard contract (`wikiLinkKeyboard.ts`: arrows select/exit, Enter navigate/resolve, Backspace/Delete, Escape)
- **Editorial expand + measured reflow** — Staged width transition for `editorial-reflow` via `buildEditorialReflowLayoutStaged`; `WikiEditorialSurface` exposes `data-expand-behavior` / `data-layout-phase`; CSS differentiates prose-stack vs editorial-reflow (`prefers-reduced-motion` respected)
- **`blockCapabilities` dispatch** — `executeBlockAction`, `useBlockActions`; `text-tiptap` uses `CodexBlockChrome`; expand/focus/issues route through registry
- **Unified draft flush** — `PageBlockDraftRegistry` with `registerDraft` / parallel `flushAll`; hybrid Save on wiki edit toolbar; semantic metadata editors register dirty + flush (autosave on blur unchanged)
- **`entity-appearance` block** — Authored embodiment surface (summary, tags, portrait) backed by page metadata; auto-injected on character/bestiary pages with full appearance mode
- **Reader section tabs** — Party users can navigate Overview, Lore, Appearance, Relationships, and Timeline; Discovery and Continuity remain DM-only
- **Appearance summary prompting** — Collapsible writing prompts and rotating micro-prompts guide embodiment prose without rigid physical-descriptor schemas
- **Lore semantic subview blocks (Phase 1)** — Read-only Identity History, Interpretations, and Sources & Provenance collapsible sections above the wiki grid on the Lore subview; `useLoreSemanticBundle` parallel-fetches existing lore APIs with unified loading and per-slice error isolation; reader-first org/family Lore tab fallback when wiki subview tabs are hidden. Plan: [canonical-page-editor.md](docs/plans/canonical-page-editor.md)
- **Rich discovery states** — Unified `DiscoveryStateProjection` (`hidden`, `rumor`, `partial`, `contested`, `known`) with orthogonal `ContentPresenceState.availableFromEpochMinute` scheduling; `projectDiscoveryState()` two-pass resolver; party-knowledge API, codex browse rows, and link index batch projection; `DiscoveryStateBadge` omits `known` in dense browse. Plan: [phase-23-discovery-knowledge.md](docs/plans/phase-23-discovery-knowledge.md)
- **Page narrative status substrate** — `PageNarrativeStatus` sidecar with Prisma enum (`ACTIVE`, `MISSING`, `DEAD`, `ARCHIVED`, `RUMORED`, `RETIRED`, `HISTORICAL`, `LEGENDARY`, `SECRET`); `projectPageNarrativeStatus()` for party vs GM visibility; GM Codex edit + character identity dual-write; browse/search facet and `status:` token; wikilink styling and graph relationship hints. Module: [`shared/pageNarrativeStatus.ts`](shared/pageNarrativeStatus.ts). Plan: [canonical-page-editor.md](docs/plans/canonical-page-editor.md)
- **Codex diagnostics expansion** — DM toolbar `Codex • N issues` chip with smart toggle (open rail + continuity pulse, or Continuity subview); shared `usePageCodexDiagnostics` hook; discovery-aware Codex rail section ordering and header subtitles; read-only party discovery strip in player rail; `jump_to_continuity` opens rail when page has issues. Modules: [`pageCodexDiagnostics.ts`](frontend/src/lib/pageCodexDiagnostics.ts), [`CodexDiagnosticsChip.tsx`](frontend/src/components/wiki/CodexDiagnosticsChip.tsx)

#### Federated identity

Plan: [plugin_ecosystem_readiness](../../docs/plans/plugin_ecosystem_readiness_80ccc931.plan.md).

- **External identity providers** — Instance-scoped OIDC (one standard flow): admin CRUD, `GET /api/auth/providers`, PKCE start/callback, encrypted client secrets (`AUTH_SECRETS_KEY`)
- **Hybrid auth** — Password + multiple linked upstream IdPs; link/unlink in user settings; add/remove local password
- **Login-time group sync** — Configurable `groupsClaim` per provider; promote-only `groupRoleMappings` to `SYSTEM_ADMIN`
- **Removed** `openid-connect` plugin stub and `auth:strategy` plugin permission (identity is core-only)

#### Maps & spatial

Plan: [map-presence-visibility.md](docs/plans/map-presence-visibility.md).

- **Interactive map canvas** — High-res world and battle map viewer with coordinate pins linked to wiki entities and nested maps
- **Dynamic pin previews** — Hover cards summarizing linked wiki pages
- **Asset pipeline** — `sharp` compression/downscaling for cartography uploads; thumbnail variants; dual-stream hardening; `MAP_PRESERVE_FULL_RES` admin override; S3/R2/MinIO deployment guidance
- **Map Settings** — Link maps to Location wiki pages (`mapAssetId` embed), nested-in readout, pin summary, and delete
- **Nested map pins** — Quick-drop and pin editor support `targetAssetId` for drill-down cartography
- **Map list enrichment** — `GET /maps` returns linked location title, pin count, and parent maps referencing each asset
- **`PATCH /maps/:assetId/link-page`** — Atomic one-link-per-map binding to Location pages
- **Map scene foundation** — `MapLayer`, `MapSceneObject`, scene GET API, normalized geometry, layer UI, Ghost Mode
- **Temporal map projection (v1)** — `visibleFrom`/`Until`, keyframes API, “View at date” on map viewer
- **Map atlas extensions** — Region draw/edit, labels, tokens, pin grouping UI; render non-pin scene objects

#### Codex browser

- **Character Hub (campaign cast board)** — Dedicated Characters index replaces generic entity browser: location-grouped `CharacterCastEntry` cards with portrait, presence tier bands (Active This Session / Recently Active / Dormant), Known Through, Last Seen, Active In, co-seen companions, and session memory snippets; master-detail `CharacterHubRail` (campaign summary + selected-character preview); table view with location section headers (power-user secondary); nested hierarchy view removed. API: `GET /c/:slug/wiki/character-hub/:pageId`. Plan: [character-hub.md](docs/plans/character-hub.md)
- **Universal codex hierarchy** — Category browse registry, maps hub browse adapter, `CodexHierarchyView`, parent trails on rows, collapse-delta expansion persistence
- **Shared browse projection** — Cards, table, and nested hierarchy views share one search/refine path via browse registry
- **Hierarchy guardrails** — Indexed `allById` lookup, React memo boundaries, projection drift guard, `codexHierarchy` unit tests; optional `includeAncestorIds` seam for post-v1 ancestor reveal

#### Data portability

- **Sovereign backup operational layer** — `sovereign/operational.json` in campaign ZIP exports downtime haven/project satellite rows, `PluginData`, and plugin settings; restore replays them with `bootstrapPackSatelliteRows` fallback for older archives
- **In-campaign backup restore** — Campaign Settings → Data & backup → Upload backup ZIP (`POST /api/campaigns/:handle/backup/restore`)
- **Import wizard cleanup** — Removed inert OneNote and Notion placeholder cards; Obsidian Markdown ZIP and Esiana backup remain
- **Portability documentation** — [data-backup-and-export.md](../docs/features/data-backup-and-export.md) documents three tiers (lore sovereign / wiki-linked operational / full clone) and falsification test steps
Plan: [plugin_registry_activation](../../docs/plans/plugin_registry_activation_ee645924.plan.md) (registry); [campaign_backup_zip](../../docs/plans/campaign_backup_zip_da0c0480.plan.md) (async backup).

- **Unified campaign backup engine** — Downloadable `.zip` of wiki, templates, and relations
- **Sovereign content export** — Portable Markdown + frontmatter and isolated `/media` in backup
- **Fantasy-calendar interoperability** — Export to external `fantasy-calendar` JSON spec
- **Plugin registry activation** — Load external scripts from official remote JSON manifest (local `/plugins` install continues to work)

#### Notifications

Plan: [phase_8_notifications](../../docs/plans/phase_8_notifications_cf3fa65f.plan.md).

- **In-app notification bell/inbox** — Read/unread, deep links; admin-configurable poll interval (default 60s). See [docs/notifications.md](docs/notifications.md)
- **User preferences** — In-app and email channel toggles; nodemailer SMTP when configured; admin test email
- **Transactional email** — Forgot/reset password + optional campaign invite-by-email
- **Event hooks** — Join request resolved/received, role changes, member departure, session publish/change/cancel/reminder, RSVP digest, import/restore complete/failed, async export ready
- **OOC session schedule** — Per timeline session datetime/venue editor with party publish notifications and 24h reminder sweep
- **Server RSVP** — `SessionAttendance` API; Session Clock widget uses next published session
- **Async campaign backup** — Background export with notification download link (3-day staging TTL)
- **DM ownership transfer** — Two-step offer/accept handshake at `/c/:slug/transfer-ownership`

#### Security

- **Rate limits** — Auth and apply/public write throttling (in-memory, env-tunable)
- **Upload validation** — Magic bytes, wizard caps, `.doc` rejection; file type, size, and path audit for uploads and session documents
- **ACL-backed media** — `/uploads/:filename` and `/api/users/:id/avatar` with private cache headers and ETag
- **Tenant isolation** — Controller boundary audit fixes ([docs/security/tenant-isolation-audit.md](docs/security/tenant-isolation-audit.md))

#### Plugin ecosystem

Plan: [phase-10-ecosystem.md](docs/plugins/phase-10-ecosystem.md), [phase_10_plugin_ecosystem](../../docs/plans/phase_10_plugin_ecosystem_12730998.plan.md).

- **Storage & events** — `StorageDriver` interface (local + S3 stub); non-blocking `dispatchDomainEvent`; controller mutation sync
- **Auth & API** — OIDC-ready schema (`passwordHash`, polymorphic `Account`); global bearer tokens with scopes and `lastUsedAt`
- **Presentation** — Plugin UI themes, custom fields, layout widgets; OPDS read-only feed plugin (study)
- **Data interceptors** — Worker-sandboxed hooks with allowlists, failMode, quarantine — see [docs/plugins/data-interceptors.md](docs/plugins/data-interceptors.md)
- **UI slots** — Declarative slots with error boundaries (header, sidebar, map, campaign-plugin-settings)
- **Guardrails** — Worker threads, concurrency cap, payload limits; inline `configSchema` settings generation
- **Lifecycle hardening** — Cross-namespace route firewall, scoped token audit, dynamic CSP, diagnostics/quarantine, uninstall policies, read-only `wiki:decorate` — see [docs/plugins/phase-10-ecosystem.md](docs/plugins/phase-10-ecosystem.md)

#### Campaign Home

- **Dashboard summary API** — Role-aware `GET .../dashboard` payload with status strip and widget data
- **Campaign Home grid** — Zone-oriented responsive layout with silent legacy widget ID remap
- **Core widgets** — `SessionScheduleCard`, `WorldChronometerWidget`, `CampaignBulletinWidget`, `RecentLoreWidget`, `PartyWidget`, `CampaignPulseWidget`, `LastSessionNotesWidget`
- **Personal continuity** — `QuickUtilityNav`, `ContinueWhereYouLeftOff`, optional `PinnedItems`; visibility-aware recent lore feed

#### Recruitment & hub

- **Platform guides** — Bundled markdown at `/guides/:slug` (Getting Started, Table Guide, Joining Process, Safety & Comfort); header links on recruitment directory
- **Safety tools glossary** — Shared glossary with linkable help in recruitment safety sections
- **Authenticated hub** — `GET /api/users/hub` powers welcome strip, continue row, and upcoming sessions on the global hub
- **Chronicle canvas** — Master chronicle index layout for global timeline events
- **Public recruitment landing** — Rich LFG pages (rules, scheduling, world background)
- **LFG join-request context** — Timezone and applicant info on seat requests; optional deny reasons when declining

#### Workflow polish

- **Sidebar IA reorder** — Campaign nav reorganized into PLAY / WORLD / TIMELINE / TOOLS zones; Campaign Home before Party; expandable Adventure submenu (Adventure Board, Threads, Investigation, Scenes, Continuity, Unresolved, Arcs, Sessions); Threads removed from standalone Narrative zone; Objects hidden by default in WORLD; legacy `gameManagementOrder` migrates to `playOrder` + `toolsOrder`. Plan: [sidebar-ia-reorder.md](docs/plans/sidebar-ia-reorder.md)
- **Granular campaign cloning** — Copy templates, calendars, and folders without session logs
- **Ambient auto-linking** — Regex/token hover tooltips for known entity names and aliases
- **Writer analytics & backlink wizard** — Read-time analyzer and cross-link suggestions while editing
- **Hover link preview** — Rich preview card on wikilink hover
- **Custom 404 pages** — Branded error pages with mascot artwork

### Changed

- **Campaign access — Phase 3** — `Campaign.discoverability` enum column (`private` | `unlisted` | `public`) replaces `isPublicViewable` / `isPublic`; owner settings expose three discoverability tiers with anonymous codex copy; Global Hub lists only `public` campaigns; `world.edit` route shim removed in favor of domain capabilities (`quest.edit`, `thread.edit`, `page.edit_any`, `requireGamemasterSettings`, etc.); legacy role map and deprecated capability grants removed; wiki list queries use `narrative.elevated_view` for read widening (not edit caps). Migration: `20260611140000_campaign_discoverability_enum`.
- **Workspace-first campaign URLs** — Structured lore uses semantic paths (`/campaigns/:handle/characters/mario`, `/adventures/rainbow-road-heist`, etc.) with `pathKey` scoped per `CampaignWorkspace` enum. Freeform pages live under `/pages/:pathKey`. `CAMPAIGN_WORKSPACE_ROUTES` is the platform registry for segments, navigation, and href generation. Category hub dispatch moved from `WikiPage` to `WorkspaceIndexPage`. Legacy `/wiki/:cuid` public routes removed (no redirects). Run `npx tsx backend/scripts/backfillWikiPathKeys.ts` after migrate on existing databases.
- **Atmospheric identity propagation** — Palette identity now modulates workspace atmosphere through environmental lighting (60%: haze, shadow temperature, glow) with subtle surface temperature drift (40%); `ambientContrastBias` tunes perceptual density (region fades, shadow softness, depth-edge visibility) without changing luminance bands. New tokens: `--color-atmosphere-*-rgb`, `--atmosphere-*`. Background tint boosts strength ~1.5×. Surfaces stay neutral charcoal; the air carries identity. See [surface-hierarchy.md](docs/surface-hierarchy.md), [design-tokens.md](docs/design-tokens.md).
- **Atmospheric amplitude pass** — Strengthened environmental rendering channels (haze, shadow/vignette, glow) so palette identity reads as a cohesive world rather than additive decoration. Depth-1/2/3 now participate in the atmospheric hue ladder for subtle, palette-aware sectional separation. New alpha tokens: `--atmosphere-haze-alpha`, `--atmosphere-glow-alpha`. See [surface-hierarchy.md](docs/surface-hierarchy.md) and [design-tokens.md](docs/design-tokens.md).
- **Workspace composition convergence** — Route-driven composition presets (`workspaceComposition.ts`); campaign shell decoupled from `max-w-5xl mx-auto` on workspace routes; asymmetric `NarrativeLayout` grid for codex/dashboard; hub full-bleed browse fields; prose measure moved inward to blocks; embedded context/codex rails with sectional depth; unified Campaign Home focal field. Document-mode pages (settings, world-advance) retain centered measure. See [surface-hierarchy.md](docs/surface-hierarchy.md), [design-tokens.md](docs/design-tokens.md).
- **Cinematic narrative workspace** — Editorial dark luminance pivot: smoked-charcoal focal (`smoked_charcoal` / `violet_smoke` / `cool_graphite`); depth axis tokens (`--color-depth-0`…`4`); absorptive elevation (removed emissive focal glow); warm-charcoal contextual veil; region composition utilities (`region-compose`, `region-depth-*`); accent discipline (sidebar depth-shift active states); canvas vignette/grain; hub and continuity depth-3 fields. Light/parchment presets unchanged. See [surface-hierarchy.md](docs/surface-hierarchy.md), [design-tokens.md](docs/design-tokens.md).
- **Editorial convergence — theme harmonization layer** — `atmosphericDerivation.ts` translates theme identity into surface role tokens; genre-tinted focal variants (`parchment`, `fantasy_cream`, `cyber_ink`); accent palettes supply hue bias only (no raw neutral override); single CSS variable path via `themeConfigToCssVariables`. See [surface-hierarchy.md](docs/surface-hierarchy.md), [design-tokens.md](docs/design-tokens.md).
- **Editorial convergence — atmospheric palette pass** — Replaced cold slate/navy shell tokens with warm neutral-charcoal atmospheric ramp (`#0b0d10` canvas, sepia borders, translucent contextual veil); layered canvas gradients; sidebar/header/rail palette recession; focal warm glow bridge. Global (includes Admin). See [surface-hierarchy.md](docs/surface-hierarchy.md), [design-tokens.md](docs/design-tokens.md).
- **Editorial convergence — shell convergence pass** — Campaign shell is canvas-only (removed `surface-primary` outlet wrapper); recessed header and sidebar on atmospheric canvas; `canvas-atmosphere` / `workspace-gutter` utilities; inline contextual rails without card chrome; Campaign Home wide workspace composition; softer in-page focal elevation and contextual translucency. See [surface-hierarchy.md](docs/surface-hierarchy.md).
- **Editorial convergence — continuation pass** — Codex title/identity moved into focal plane; shared `renderCodexRail()`; focal-tone `RecentEntityFeed`; runtime role-token derivation in `themeVariables.ts`; collapsible mobile Campaign context rail; `CategoryHubShell` for Quest/Thread/Entity/Tags hubs; tonal hub cards. See [surface-hierarchy.md](docs/surface-hierarchy.md).
- **Editorial convergence — tonal surface system** — Six-role tokens (canvas, focal, contextual, recessed, operational, elevated) with dual-theme composition (dark shell + warm focal plane); Codex lore entry focal surface; contextual rail tonal softening; `NarrativeLayout` primitive with desktop inline rail; display/editorial typography tiers; Campaign Home continuity stream + context rail in default layout. See [surface-hierarchy.md](docs/surface-hierarchy.md), [design-tokens.md](docs/design-tokens.md).
- **Surface hierarchy and tonal depth** — Primary / contextual / recessed / operational surface roles (`surfaceLayout.ts`, `docs/surface-hierarchy.md`); Campaign Home hero + status metadata composition; contextual widget tiles; codex Reading-mode recessed chrome; session notes list/body hierarchy; ultrawide sidebar recede.
- **Design convergence — visual primitives pass** — Applied design tokens and density doctrine on high-traffic surfaces: codex responsive toolbar (stacked mobile, grid off below 768px), per-block save status (Saving / Saved / Retry / Failed), Reading-mode prose rhythm with collapsible block sections and anchor targets, appearance read tabs on mobile, calmer App Header and Campaign Home widget chrome. See [design-tokens.md](docs/design-tokens.md), [density-doctrine.md](docs/density-doctrine.md).
- **Canonical page editor:** semantic wiki blocks (overview, biography, relationships, timeline, discovery) replace inspector metadata forms; single Edit page mode; Codex rail for world consistency and links; page subviews and workspace density modes; CHARACTER editorial layout with opt-in migration. See [docs/plans/canonical-page-editor.md](docs/plans/canonical-page-editor.md).
- **Fluid wiki blocks:** grid row heights driven by live content measurement (persist only `x`, `y`, `w`); legacy layout migration removed in favor of semantic defaults on load; compact / expanded / focused editing scales with subtle layout animation and focus overlay; wiki pages use CSS editorial flow (RGL only for template layout authoring) so document scroll and container height follow measured content.
- **Workspace orchestration profiles:** Focused / Balanced / Expanded / Immersive modes now drive runtime behavior (readable measure, block priority, prose auto-expand, Codex rail density, expanded-layout reflow vs dense grid, focus-overlay preference) via `workspaceOrchestration.ts` and `surfaceDensityProfile.ts`; page delete only in edit mode; header spacing tightened.
- **Wiki page header hierarchy:** campaign breadcrumbs, narrative subtitle (not template chips), separate access vs discovery controls with current state, runtime toolbar (workspace / Codex / edit) right-aligned; access ACL edit-only, discovery always available to DMs, subview tabs in header, quieter toolbar chrome; immersive no longer auto-opens Codex rail.
- **Header identity + Codex intelligence:** wiki nav breadcrumbs include category folders (`Characters › Salt Bay`); header is identity-only (title + editorial subtitle); discovery, access, and party-character assignment live in Codex rail; NPCs no longer labeled “Player character”; party link editable inline in Codex edit mode.
- **Appearance subview:** Characters and Bestiary get a dedicated Appearance tab (summary prose, freeform tags, optional portrait) via `entity-appearance` block; hero editing is identity-only; appearance removed from infobox duplication; profile-driven `appearanceMode` + `appearanceCapabilities` (gallery/forms/discovery variants); reader-visible section tabs for party users.
- **Character identity vs appearance split:** pronouns stay on the hero as `Name (pronouns)` with profession as subtitle; gender and presentation move to Appearance (`appearance.gender`, `appearance.presentation`, `appearance.pronouns` in metadata); legacy top-level gender/pronouns migrate on read; Identity & presence section on the Appearance tab.
- **Personal pins vs Quick Access** — Wiki pin button keeps per-user dashboard shortcuts (`PageShortcut` via `GET /wiki/pins`); sidebar Bookmarks renamed **Quick Access**, moved to utility nav (hidden by default, Planned badge), decoupled from personal pins; seeded wiki category renamed with legacy `Bookmarks` wikilink alias
- Map viewer shows linked Location title instead of asset ID fragments; DM settings gear links to map settings
- Maps category no longer shows wiki child index or minimal upload panel
- **Unified narrative projection semantics** — Shared viewer context, revelation, role visibility, and explicit temporal policy across chronology, wiki, maps, lore, and entity views. Module: [`shared/narrativeProjection.ts`](shared/narrativeProjection.ts); docs: [narrative-projection-semantics.md](docs/architecture-internal/narrative-projection-semantics.md)
- **Canonical chronology interfaces** — Shared `ChronologyInstant`, domain anchors, stable entry ids, and deduplicated `ChronologyDateParts` in [`shared/chronologyTypes.ts`](shared/chronologyTypes.ts)
- **Cross-domain chronology convergence** — `GET /c/:slug/chronology/overlay` returns eagerly projected `ConvergenceTimelineEntry` feed; Chronology Hub **Campaign feed** tab with domain filters, date grouping, and session-linked filter. Docs: [chronology-convergence.md](docs/architecture-internal/chronology-convergence.md)
- **Revamp Campaign ACL (Phase 1)** — `campaignOwnerUserId`, `GAMEMASTER`/`WRITER`/`PARTICIPANT`/`OBSERVER`, `shared/campaignPolicy`, split ownership vs gamemaster transfer. Plan: [campaign-access-model.md](docs/architecture-internal/campaign-access-model.md)

## [0.8.0] - 2026-05-30

Beta milestone.

### Added

- Product version source of truth: root `package.json`, backend `productVersion` module, Vite `__ESIANA_VERSION__`, admin sidebar display above Resources
- Product changelog (`changelog.md`) and in-repo plan snapshots (`docs/plans/`)

### Changed

- Reorganized development roadmap (`todo.md`) to reflect shipped Phases 1–4, session combined notes, and snapshot export; clarified v0.8.0 beta focus. Plan: [Elevate todo.md](docs/plans/elevate-todo.md)
- README and versioning note aligned with `package.json` as release version

## [0.7.0] - 2026-05-29

Alpha milestone. Entries below summarize work shipped through the v0.7.0 alpha line and subsequent post-baseline phases (retrospective; changelog started 2026-05-29).

### Added

- Multi-campaign global hub, public directory, slug URLs, and LFG listings with join requests
- Hierarchical wiki tree, block-based pages, visibility levels (Public / Party / DM-only), bookmarks, category indexes
- Template Studio and per-folder page templates
- Session timeline, notebook arcs, compile-to-Markdown, document uploads
- Fantasy calendars (custom months, advance time, JSON import) and chronology hub
- Configurable campaign dashboard and sidebar
- Developer API tokens, user profiles, system admin console (branding, backups, usage analytics)
- Local runtime plugins (`/plugins` install and toggle)
- Game system metadata on campaigns (`gameSystem`)
- Campaign creation wizard with Obsidian and Notion import parsers
- Wiki breadcrumbs, default entity templates, backlinks graph (`WikiLink`), outlinks radar, wikilink integrity and safe deletion
- Session notes **All View** (multi-author grid), combined API, entities-mentioned ribbon, DM masking
- Session snapshot Markdown export (preview, copy, download) — see [docs/session-anthology.md](docs/session-anthology.md)
- Player identity mapping (`identityPageId`, campaign settings picker, `useIdentityDisplay`)
- Master chronicle index and rich public recruitment lobby pages
- Mobile viewport fixes and collapsible campaign navigation — see [docs/viewport-audit.md](docs/viewport-audit.md)

### Changed

- Category index endpoints aggregate by entity type with ancestral location tags
- Session compile hardened for partial timelines, missing pages, and large notebooks

### Security

- Secure parental deletion workflows to reduce accidental cascade deletes
