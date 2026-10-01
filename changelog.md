# Changelog

## Unreleased

### Added

- **Search ranking and grouping (Pass 6)** — within-tier ranking signals (title specificity, type prior on non-exact name tiers, recency, occurrence density), portable fuzzy name matching (OSA edit distance over `titleNorm`/`aliasText`), entity dedupe, and server-shaped result sections (best match, collapsed mentions, capped type groups). Optional `explain=1` diagnostics. Ranking regressions are covered by golden scenarios separate from Pass 5 retrieval.
- **Indexed Global Search (Pass 5)** — derived `SearchIndexDocument` projection with PostgreSQL `tsvector`/GIN candidate retrieval (portable multi-token LIKE over the same table on SQLite). Replaces the single-token `LIMIT 200` base-table LIKE prefilter. Write-path upserts, campaign rebuild on import/clone/restore, `pnpm bench:search`, and `backend/scripts/backfillSearchIndex.ts`. Authorization, ranking, and response shape are unchanged.
- **Command palette** — type `>` in campaign search (or Ctrl/Cmd+Shift+P) to run permission-aware Core commands: create all CreatePageModal codex types (characters, bestiary, ancestries, organizations, locations, objects, families, rules/resources) derived from workspace route `createVia`, plus session notes; jump to Sessions, Timeline, Developments, and Settings; advance campaign time; and edit or copy a link to the current page.

### Changed

- Prisma ORM upgraded to **7.10.0** (`prisma` + `@prisma/client` locked together). Driver adapters (`@prisma/adapter-pg` / `@prisma/adapter-better-sqlite3`), `prisma.config.ts`, and `createPrismaClient()` are required; Dependabot ignores major bumps for both Prisma packages.

### Database

- Migration `20260930140000_search_index_document` — adds `SearchIndexDocument` (tiered searchable text + optional PostgreSQL `tsvector` columns with GIN indexes).

## [1.6.0] - 2026-09-30

### Added

- **Campaign search** — Search wiki content by title, aliases, metadata, custom fields, and body text with ranked, highlighted results; open with the search button or Ctrl/Cmd+K, keyboard navigation, and recent searches. Query syntax supports quoted phrases, `-excluded` terms, and `type:`, `in:`, `from:`, `after:`, `before:` filters with value suggestions and removable filter chips. Results respect wiki visibility and may include eligible plugin content.
- **Outgoing webhooks** — Campaign-scoped webhook endpoints under Campaign Settings → Integrations with a versioned public event catalog, per-endpoint subscriptions, encrypted signing secrets (one-time display, rotation), timestamped HMAC-SHA256 signatures, HTTPS-only SSRF-safe delivery, bounded restart-safe retries, automatic suspension after repeated failures, delivery history, test deliveries, and manual redelivery.
- **Discord integration** — First-party Discord destinations (multiple per campaign) with encrypted webhook URLs, an explicit Discord event catalog, typed embed formatting, Discord rate-limit handling, health state, delivery history, and test messages.
- **Campaign WebSockets** — `GET /api/campaigns/{campaignHandle}/ws` alongside the existing SSE stream, sharing authorization, visibility filtering, redaction, and membership-revocation handling. Separate realtime session protocol for presence, cursor, and typing messages that never enters external event subscriptions.
- **Session Notes attendance** — Notes / Attendance / Recaps tabs; Attendance shows which members have notes per session, respects session visibility, and marks the latest visible session as Current. Recaps is marked coming soon.
- **Entity pages and custom fields** — Page management (create, duplicate, reorder, rename, hide, remove tabs) extended from characters to locations, organizations, bestiary, ancestries, families, and quests via entity-neutral API routes. Custom fields can be created, renamed, reordered, moved between pages, and deleted, with persisted ordering and core/plugin/API/custom provenance protections.
- **Character masthead identity** — Restored editable identity and lineage details (ancestry, home, primary family, birth and death dates), affiliation and tags under World context, and temporal status in the character masthead.
- **Request rate limiting** — Named policies (`authenticated`, `mutation`, `expensive`, `public`, `admin`, `api-key`) applied across the API with `Retry-After` on limited responses. Configured via `RATE_LIMIT_*` environment variables (see `backend/.env.example`); only the in-memory store is supported. Limits do not change authentication or authorization.
- Scheduled nightly builds for `develop`: moving `nightly` Git tag, multi-arch images tagged `nightly` and `nightly-YYYYMMDD-<shortsha>` on GHCR and Docker Hub, skip when unchanged, and tag advance only after a successful publish.

### Changed

- Package `engines.node` is `>=26.0.0` (was `>=22.10.0`), matching the only tested runtime (CI `setup-node` and Docker `node:26-alpine`).
- OpenAPI specification synchronized with the new search, webhook, Discord, WebSocket, entity-page, and rate-limit routes.

### Fixed

- Search filters: author and date filters follow consistent matching rules; unresolved author names return no results; `type:` in the query takes precedence over the selected search tab.
- Search dialog focus trap.

### Database

- Migration `20260927120000_entity_field_order` — adds `CharacterField.displayOrder`.
- Migration `20260927180000_campaign_webhooks` — adds `WebhookEndpoint` and `WebhookDelivery`.
- Migration `20260927190000_campaign_discord` — adds `DiscordDestination` and `DiscordDelivery`.
- Migration `20260927200000_encrypt_webhook_urls` — renames `WebhookEndpoint.url` to `urlEnc`; application startup completes the data migration using the configured secret-box key.

Apply migrations before enabling webhook or Discord integrations.

## [1.5.0] - 2026-09-26

### Added

- **Campaign event stream (SSE)** — Authenticated, campaign-member-scoped `GET /api/campaigns/{campaignHandle}/events` with a canonical versioned event envelope for wiki pages, campaign time, timeline events, developments, and characters; the wiki tree refreshes live on changes and events are re-dispatched to browser consumers and plugins.
- **Character pages, fields, and appearance** — Core, custom, and plugin-provided character tabs (reorder, rename, hide, duplicate, manage); representation-independent `CharacterField` persistence and APIs with typed plugin field declarations; masthead with identity, appearance, title, and visibility; appearance selection in the URL, inheritance indicators, and revert controls. Pages, fields, and plugin page data are included in backup/export and restore.
- **API provenance** — `API` origin alongside `CORE`/`CUSTOM`/`PLUGIN` for pages and fields created through API tokens, with source identification and a warning when deleting API-created pages.
- **Source references and provider search** — Versioned `SourceReference` codec, source-provider registry with campaign authorization and permission gating, `/source` command and toolbar picker, citation rendering and popover, and plugin capability for searchable sources.
- **Plugin connections** — Campaign- and user-owned encrypted connection records; OAuth 2 authorization-code + PKCE, API-key, and static bearer connections; backend-only authenticated fetch restricted to declared origins with SSRF checks; admin OAuth client configuration.
- **Developments page** — Pending developments as primary focus, compact World Development status, Apply / Edit / Dismiss actions, direct Advance Time, and sparse-campaign guidance.

### Fixed

- SSE events are filtered per subscriber by wiki, chronology, and role visibility; streams close on membership or permission changes; heartbeats revalidate membership.
- `WikiPage.updatedAt` is no longer backdated by temporal-import metadata; alias changes touch the parent page.
- Plugin registry default resolves to `https://github.com/Esiana-ttrpg/community-plugins/registry.json`; branchless GitHub URLs follow the default branch.
- Campaign snapshot prompts to set current campaign time when the world date is unset.
- New and Duplicate Campaign wizards keep header, step navigation, and actions reachable on constrained-height viewports.

### Database

- Migration `20260924120000_plugin_connections` — adds `PluginOAuthClient`, `PluginConnection`, and `PluginConnectionAuthState`.
- Migration `20260925120000_character_page_tabs` — adds `CharacterPageTab` and `PluginCharacterPageState`.
- Migration `20260925160000_character_fields` — adds `CharacterField`.
- Migration `20260926120000_api_character_provenance` — adds `apiSourceId` / `apiSourceName` to `CharacterPageTab` and `CharacterField`.

## [1.4.3] - 2026-09-22

### Added

- Complete OpenAPI 3.1 contract coverage for the backend API, with route-inventory tooling and public YAML/JSON specifications under `/api/docs`.

### Fixed

- Campaign assets accept bearer authentication as well as session authentication.
- Campaign dashboard navigation no longer shows stale hero artwork from the previously viewed campaign.
- Campaign presentation tagline edits remain stable, and duplicate headline/tagline text is suppressed on campaign cards.
- Recruitment lobbies distinguish real-world party size from open recruiting seats and display the campaign host separately.
- Theme switching preserves the active theme profile and correctly reapplies its surface tokens.
- Wiki formatting toolbar actions preserve the editor selection so inline and block formatting applies to the intended text.
- OpenAPI documentation and raw specification routes resolve correctly in production builds.

### Removed

- Wiki page templates as a parallel structure system: unused `Template` table, create/layout no longer accept a client `templateType` to choose page structure, and user-facing template-type chips. Module create flows and generic Pages remain.

### Database

- Migration `20260814190000_drop_wiki_page_templates` — drops unused `Template` table.

## [1.4.2] - 2026-08-14

### Fixed

- Backend no longer loads jsdom/undici at startup; tag-icon SVG sanitization uses DOMPurify with Linkedom so Docker on Node 20 (v1.4.0) and Node 26 does not crash with `webidl.util.markAsUncloneable is not a function`.

### Changed

- Production dependencies: TipTap 3.30, React 19.2.8, nodemailer 9, dotenv 17, sharp 0.35, and related patches. Slack integration icon uses Font Awesome (`FaSlack`) because Simple Icons dropped `SiSlack` in react-icons 5.7. Skipped Prisma 7, lucide-react 1, react-grid-layout 2, and react-resizable 4.
- Docker build and runtime images use `node:26-alpine` (was `node:20-alpine`); the build stage installs `pnpm@9.15.9` via npm because Node 26 no longer bundles Corepack. Closes [#82](https://github.com/Esiana-ttrpg/esiana-core/issues/82).
- Package `engines.node` is `>=22.10.0`; CI `setup-node` uses 26 to match Docker.

## [1.4.0] - 2026-08-14

### Added

- **Journal — Library + Planner** — Narrative publishing surface: a **Library** archive of released publications and a capability-gated (`JOURNAL_PLANNER_ACCESS`) **Planner** for drafts, release conditions, and recurring series. Release rules are a nestable `ALL`/`ANY` DSL over chronology, narrative, discovery, downtime, and reputation; comparison operators and envelope support; lazy resolution on Journal load and time-advance (no scheduler).
- **Workshop writing workspace** — Dedicated writing workspace, expanded formalize targets, and lore/biography tab architecture for entity writing.
- **Wiki admonitions** — Semantic TipTap callouts with neutral styling.
- **Markdown / print / ASCII export** — Campaign lore export to Markdown, print, and ASCII.
- **Campaign wizard expansion** — Location and scheduling steps in New Campaign Wizard.
- **Unified Adventure board** — Adventure hub on `CategoryHubShell` with typed create flows.
- **Wiki editor shell** — Unified editor shell, page transform, and page settings (inspector removed).
- **In-app docs links** — Contextual “learn more” links on GM surfaces (plugins, maps, discovery, world advance, campaign wizard, admin) pointing at the public docs wiki.

### Changed

- **Character, location, and quest shells** — Writing-first character editing; location and quest hub shells aligned with category hubs.
- **Quest/arc visibility** — Lifecycle separated from wiki ACL.
- **Legacy `templateType`** — Removed leftover entity template-type usage.
- **Visual theme** — Theme and visual polish across campaign surfaces.
- **Dead-code cleanup** — Removed orphaned hub/dashboard stubs, unused aliases, and retired generator surfaces.
- **Agent context** — Reduced agent guidance to current-decision docs (`AGENTS.md` and companions).
- **OIDC sessions** — Session version and nonce on OIDC auth state; related rate limits.

### Fixed

- Campaign settings auth typing for `gameSystem` fields.
- Character overview requires non-null `campaignNow`.
- Workshop draft API rate limit and CI build errors.
- Wiki page transform `actorRole` typing.

### Database

- Migration `20260703120000_journal_publications` — adds `JournalPublication`, `JournalSeries`, and `JournalReleaseReceipt` (Prisma-portable, inline FKs for dual-engine).
- Migration `20260730120000_journal_publication_tags` — adds `JournalPublication.tags`.
- Migration `20260730130000_journal_summary_series_owner` — adds `JournalPublication.summary` and `JournalSeries.createdByUserId`.
- Migration `20260731180000_oidc_session_version_nonce` — adds `User.sessionVersion` and `OidcAuthState.nonce`.

## [1.3.0] - 2026-06-30

### Added

- **Campaign Home briefing widgets** — Narrative-first Campaign Home with world events, recent entities, faction conflict, and quick utility navigation; tighter layout and customizable widget grid.
- **Unified workspace toolbar** — Shared `WorkspaceActionBar` / `CategoryIndexToolbar` across category hubs (characters, organizations, bestiary, quests, maps, tags, and more) with consistent Refine · Sort · View · Create placement.
- **Writing stats (Phases 1–2)** — Creator attribution, profile activity feed, campaign world snapshot, contributor rollups, and period-accurate word deltas backed by daily writing rollups.
- **Campaign integrations** — Chat and tabletop integration links on campaigns and recruitment lobby; settings editor for external tool URLs.
- **Account navigation** — Campaign switcher moved into account dropdown; localized account nav strings.

### Changed

- **Workspace header vocabulary** — Unified hub count hints, breadcrumb policy, and display typography (`META_*` / `TYPE_DISPLAY` roles) across campaign surfaces.
- **Experience doctrine** — Audit artifacts, scorecard, and convergence backlog for ongoing UX alignment.

### Fixed

- **Campaign creation** — Return 400 when a campaign name cannot produce a handle; linear handle normalization to avoid ReDoS.
- **Campaign cover ingest** — Ingest cover image after the campaign creation transaction commits.
- Profile stats TypeScript and i18n key alignment; `displayName` fallback on creator stats overview.

### Database

- Migration `20260627120000_campaign_integrations` — adds `Campaign.campaignIntegrations` JSONB.
- Migration `20260629120000_user_writing_daily_rollup` — adds `UserWritingDailyRollup` and activity indexes for stats rollups.

## [1.2.0] - 2026-06-21

### Added

- **Kanka JSON import** — New Campaign Wizard path for Kanka exports: character field mapping, HTML-to-Markdown, mention resolution, maps, campaign banner, and idempotent re-import. Closes [#98](https://github.com/Esiana-ttrpg/esiana-core/issues/98).
- **Wiki markdown import** — Paste or upload Markdown when creating a wiki page from the create-page modal. Closes [#80](https://github.com/Esiana-ttrpg/esiana-core/issues/80).
- **UI locale foundation (i18n)** — Domain-first translation tree, `User.uiLocale` preference, and phased migration of shell, workspace chrome, notifications, and community locale infrastructure (Phases 1–4).
- **Plugin registry provenance** — Registry-backed catalog with provenance model; core no longer vendors community catalog packages. Admin plugin table + inspector, Plugin Sources drawer, and discovery catalog with hide-installed filter.
- **Content pack campaign cover** — Campaign cover image from content pack `campaign.json` (`coverImageAssetId`).
- **Admin update visibility** — Surface core update availability in System Config (from `main` delta).

### Changed

- **AGENTS.md** — Consolidated agent policy and GitHub ruleset references.
- Plugin engine mismatch surfaced in admin UI; enable returns 409 when `engines.esiana-core` does not match.
- SQLite local dev: Prisma deploy wiring and documented engine paths.

### Fixed

- **Obsidian importer** — Route imports into typed wiki hubs. Closes [#78](https://github.com/Esiana-ttrpg/esiana-core/issues/78).
- **Workshop navigation** — Unblock leaving the Workshop section. Closes [#79](https://github.com/Esiana-ttrpg/esiana-core/issues/79).
- **Campaign visibility** — Unified campaign actor construction and private page access.
- **Sidebar collapse** — Full-height edge rail; widen rail and fix first-click toggle.
- Vite API proxy defaults to backend port 3001 for local dev.
- `ESIANA_CORE_VERSION` optional override; `backend/.env` wins over stale shell env.

### Database

- Migration `20260618120000_user_ui_locale` — adds `User.uiLocale` for UI locale preference.

## [1.1.0] - 2026-06-17

### Breaking

- **S3 storage** — Removed `@esiana/storage-s3` from the core monorepo and Docker image. Install the **`remote-object-storage`** community plugin under `PLUGINS_DIR` and enable it in Admin when using `STORAGE_PROVIDER=s3-compatible`. Closes [#86](https://github.com/Esiana-ttrpg/esiana-core/issues/86).

### Added

- **Admin live task queue** — Split active, scheduled, failures, and paginated history views so cron runs stop flooding the live table and failures get a dedicated attention surface. Closes [#76](https://github.com/Esiana-ttrpg/esiana-core/issues/76).

### Changed

- Slimmer Docker runtime image via `pnpm deploy`
- Docker startup banner and runtime metadata in entrypoint

### Fixed

- SSRF `networkFetch` boundary and CodeQL guards for outbound fetch
- Campaign wizard uploads and PostgreSQL category index queries
- Admin Sample Data nav hidden when `ENABLE_SAMPLE_DATA` is off
- CI and Docker build hardening (pnpm lockfile guard, Prisma client in deploy bundle)

Release history is published on [GitHub Releases](https://github.com/Esiana-ttrpg/esiana-core/releases).

Archived changelog (through v1.0.1): [docs/archive/changelog-through-1.0.1.md](docs/archive/changelog-through-1.0.1.md)
