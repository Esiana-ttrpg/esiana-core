# Asset Upload Governance

## Phase 1 (test pass) — shipped

- `assetIngest` + `assetImport` (`importFromUpload`, `importFromUrl`)
- `AssetLocation` + `buildAssetLocation` (storage keys isolated from URL shape)
- `StorageDriver.put` for campaign uploads, maps, SVG icons
- URL import with SSRF guard, `redirect: 'error'`, streaming download size cap
- Magic-byte image type detection
- Write rollback on partial ingest failure
- Admin **Assets & Uploads** + **Storage** pages
- `GET /admin/storage/status` with driver capabilities
- `ImportImageUrlField` on banner, ensemble, portraits, gallery, wiki image blocks

## Phase 2 (hardening) — shipped

### Platform invariant

Structured image fields store **`/api/assets/{id}` only**. External URLs are import sources, not render sources.

| Allowed on referencing fields | Rejected |
|-------------------------------|----------|
| `/api/assets/{id}` | `http://`, `https://`, `/uploads/...` |

**Structured fields:** `hero.coverImageUrl`, `ensembleConfig.bannerImageUrl`, `appearance.portraitUrl`, `appearance.gallery[].imageUrl`, wiki `image-display` block `content.imageUrl`.

`Asset.url` / `displayUrl` / `thumbnailUrl` remain physical storage paths for the active driver.

### Shipped

- `shared/assetReferenceValidation.ts` — coerce on read, reject on save
- Save-path validation in dashboard, ensemble, wiki metadata, and wiki layout controllers
- Mandatory `importFromPack` / `importFromPackBuffer` for pack, ZIP, and backup image restore
- Structured render cleanup (`visualAtlasProjection`, recruitment hero) — no markdown/TipTap changes
- UI: raw URL text inputs removed from codex/bestiary/object/gallery editors

### Explicit cuts (unchanged)

- Migration utility for legacy external URLs
- Legacy URL scanners and warning banners
- Bulk markdown / TipTap inline image conversion
- Asset ID schema changes
- Existing content rewrites

### Deferred

- Storage usage / quotas
- Remote driver admin configuration UI (env-only for now)

**Follow-on (shipped):** [asset-storage-platform.md](./asset-storage-platform.md) — registry, `@esiana/storage-s3`, pointer-owned routing, Admin Storage metrics.

## Phase 3 — Platform hardening (deferred)

Phases 1–2 established Esiana’s first properly hardened **file ingestion** pipeline. URL image import forced a reusable pattern that should eventually apply anywhere the server accepts external content — not only campaign image uploads.

### Goal

Standardize all server-side external fetch/download on shared primitives:

```txt
Validate source → Validate size → Validate content → Store (StorageDriver) → Create record → Cleanup on failure
```

### Target primitive (future)

`backend/src/lib/networkFetch.ts` — a hardened fetch wrapper built from today’s `downloadUrlToBuffer` + `ssrfGuard`, responsible for:

- SSRF protection (`ssrfGuard`)
- Redirect policy (configurable; default `error` for untrusted URLs)
- Timeouts
- Streaming byte limits
- Protocol validation

Callers such as `assetImport`, plugin manifest download, future webhook imports, and future package downloads should consume this primitive instead of maintaining separate network security logic.

### Audit baseline (2026-06-12)

| Path | File | Uses assetIngest | SSRF guard | Streaming limits | Redirect policy | Failure cleanup |
|------|------|------------------|------------|------------------|-----------------|-----------------|
| URL image import | `assetImport.ts` | Yes | Yes | Yes (`downloadUrlToBuffer`) | `error` | Yes (storage rollback) |
| Pack assets | `packAssetImporter.ts` → `importFromPack` | Yes | N/A (local disk) | No (full file read) | N/A | Per-file via `assetIngest` |
| Campaign ZIP import | `campaignImportProcessor.ts` → `importFromPackBuffer` | Yes | N/A (ZIP buffer) | No (ZIP entry buffer) | N/A | **Gap:** assets materialized before wiki commit; import failure can orphan `Asset` rows + storage keys |
| Plugin manifest | `fetchPluginManifest.ts` | N/A (JSON) | **No** | Partial (512KB text cap, not streamed) | **`follow`** | N/A |
| Plugin registry | `fetchPluginRegistry.ts` | N/A | **No** | Partial (512KB) | **`follow`** | N/A |
| Plugin archive install | `pluginInstaller.ts` `downloadToFile` | N/A | **No** | Partial (25MB cap via `arrayBuffer`, not streamed) | **`follow`** | Temp dir cleanup on throw (partial file possible) |
| GitHub release check | `systemController.ts` | N/A | N/A (hardcoded URL) | N/A | default | N/A |
| Instance branding | `adminSettingsController.ts` | **No** — pasted `globalLogoUrl` / `faviconUrl` | N/A | N/A | N/A | N/A |
| OIDC avatars/logos | Federated identity (shipped) | **No caching yet** | — | — | — | Future: use asset ingest if cached locally |

**Pack import notes:**

- Local pack paths and ZIP entries are read into memory (not streamed) — acceptable for now.
- Per-asset cleanup works via `assetIngest`; multi-asset imports have no transaction across assets.
- Pack/ZIP/backup image paths route through `importFromPack*` → `assetIngest` → `StorageDriver.put`.
- Images validated via magic bytes; non-images via extension heuristic in `assetTypeForPackExtension`.
- Malformed or aborted pack/campaign imports can leave orphaned assets mid-loop.

### Migration candidates (priority order)

1. `fetchPluginManifest` / `fetchPluginRegistry` / `pluginInstaller.downloadToFile` — admin-supplied URLs, highest SSRF ROI
2. Campaign/pack import transaction semantics — orphan cleanup on failure
3. Future instance branding ingest (logo, favicon, OpenGraph) — replace paste-URL with `importFromUrl` or upload
4. Future OIDC avatar/logo cache
5. Future webhook / package download paths

### Future implementation phases

| Phase | Scope |
|-------|--------|
| A | Extract `networkFetch.ts` from `downloadUrlToBuffer` + `ssrfGuard`; `assetImport.importFromUrl` becomes a thin caller |
| B | Migrate plugin fetch paths (manifest, registry, archive) |
| C | Import transaction semantics — defer asset writes until commit or compensating delete on failure |
| D | Branding + OIDC cache via `assetImport` when scoped |

### Explicit cuts

- No caller migration during Phases 1–2 — audit first, migrate incrementally
- Do not block other work on a full refactor of every import path
- Tracking: [deferred-backlog.md](../deferred-backlog.md) — Import, backup & data portability
