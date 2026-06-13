# Sample Data Generator & Content Packs

Phase 1 promotes the campaign-seeder **engine** into core while keeping **authored content** in plugin Content Packs.

## Philosophy

> **Folders belong to authors. Frontmatter belongs to Esiana.**

The markdown importer recursively scans `packPath/pages/**/*.md`. Folder names are author organization only — page type comes from frontmatter (`template`, `slug`, optional skeleton `parent`).

> **Content Packs are import-time dependencies, not runtime dependencies.**

After import, campaigns own their content and continue working if the originating plugin is removed.

## Two wizard paths

| Path | Source | Gate | Audience |
|------|--------|------|----------|
| **Content Packs** | Installed `contentPack` plugins | Plugin enabled | Users — authored worlds and adventures |
| **Sample Data** | Core built-in size profiles | `ENABLE_SAMPLE_DATA=true` | Developers — QA, capacity profiling, plugin fixtures |

Both share the same orchestration queue and `provenance: seed` writes, but different mechanics:

- **Sample Data** — procedural `buildSeedPlan` → `executeSeedPlan` over campaign APIs
- **Content Packs** — `importContentPack()` orchestrates existing importers (markdown, assets, calendar, relations)

## Sample Data profiles

Built-in benchmark profiles (env-gated):

| Profile ID | Intent |
|------------|--------|
| `benchmark-small` | Starter scale (~100 pages) |
| `benchmark-medium` | Active campaign (~1000 pages) |
| `benchmark-large` | Archive scale (~5000 pages) |
| `benchmark-extreme` | Internal regression (~10000 pages; CLI/Admin only) |

Deprecated aliases: `tiny-campaign` → `benchmark-small`, `standard-campaign` → `benchmark-medium`, `large-campaign` → `benchmark-large`, `stress-test-campaign` → `benchmark-extreme`.

Operator-facing sizing: [capacity-and-sizing.md](../../../docs/self-hosting/capacity-and-sizing.md) in the docs wiki.

```env
# Developer fixtures only. Does not affect Content Packs.
ENABLE_SAMPLE_DATA=true
```

API: `GET /api/sample-data/profiles` (returns `[]` when disabled)

## Content Packs

Plugins declare `capabilities: ["contentPack"]` and a manifest `contentPacks[]` array. Minimum fields per pack:

```json
{
  "id": "haunted-lighthouse",
  "name": "Haunted Lighthouse",
  "description": "A coastal mystery ready to run.",
  "campaignFormat": "one-shot",
  "packPath": "packs/haunted-lighthouse"
}
```

Optional picker metadata: `gameSystem`, `genreThemes` (catalog slugs, max 3), `author`, `authorUrl`.

API: `GET /api/content-packs` (never env-gated)

## Orchestration principle

> **Content Packs reuse existing import/export formats whenever possible.**

The content pack importer **orchestrates** importers; it does **not** define parallel representations of pages, calendars, assets, or relations.

| Pack input | Delegates to |
|------------|--------------|
| `pages/**/*.md` | `markdownPackImporter` |
| `assets/**` | Asset pipeline (`prisma.asset` + uploads) |
| `calendar.json` | `parseFantasyCalendarExport` + `applyFantasyCalendarImport` (same schema as wizard calendar upload) |
| `relations.json` | Backup-restore relation apply patterns |
| `campaign.json` | `applyPackCampaignConfig` (tagline, description) |
| `knowledge.json` | `packKnowledgeImporter` (lore claims, historical aliases) |

## Content Pack Format v1

Target contract for authored packs and future **Export as Content Pack**. Audit matrices and decisions: [content-pack-audits.md](./content-pack-audits.md).

```
packPath/
├── pages/              # REQUIRED — recursive *.md (content + page metadata in frontmatter)
├── assets/             # OPTIONAL — images, audio, map files
├── calendar.json       # OPTIONAL — fantasy calendar definition (wizard export schema)
├── relations.json      # OPTIONAL — escape hatch (map pins, explicit links, tags)
├── campaign.json       # OPTIONAL — campaign shell (not lore)
└── knowledge.json      # OPTIONAL — lore claims + historical aliases
```

| File | Role |
|------|------|
| `pages/` | Markdown = content. Frontmatter = page metadata. |
| `assets/` | Media blobs; referenced via `asset:relative/path` |
| `calendar.json` | Calendar **definition** (months, eras) — not full chronology DB |
| `relations.json` | Structure wikilinks cannot express cleanly at import time |
| `campaign.json` | Campaign tenant shell fields only |
| `knowledge.json` | Epistemic satellite rows (`LoreClaim`, `EntityHistoricalAlias`) |

**Explicitly not in v1:** `characters.json`, `maps.json`, `calendar-events.json`, entity blobs.

### `campaign.json` v1

```json
{
  "formatVersion": 1,
  "recruitmentTagline": "string",
  "description": "optional Campaign Home blurb",
  "campaignHomeIntro": "optional — reserved",
  "startingDate": "optional — reserved chronology anchor",
  "startingLocationPageSlug": "optional — reserved slug ref"
}
```

`gameSystem`, `genreThemes`, `campaignFormat` remain **manifest** fields (plugin picker metadata).

### Metadata round-trip

Any field on `wikiPage.metadata` round-trips via [`pageMetadataRoundTrip.ts`](../../backend/src/lib/pageMetadataRoundTrip.ts):

- Export / backup / pack import share `metadataToFrontMatterFields` / `frontMatterFieldsToMetadata`
- Slug references: `slug:page-slug` on `*Id` fields and `parentKey`
- Asset references: `asset:relative/path` rewritten after asset import
- Codex custom fields: `fields` JSON array in frontmatter

### `knowledge.json` v1

Optional sidecar for discovery/epistemic rows not stored on page metadata. Applied by [`packKnowledgeImporter.ts`](../../backend/src/lib/packKnowledgeImporter.ts) after pages import.

**Format split:** **Markdown = content. JSON = structure. Assets = media.**

Do not add `characters.json`, `maps.json`, `calendar-events.json`, or other entity JSON blobs — use markdown (and `calendar.json` when a full calendar definition is needed).

### Importable-content gate

Import fails **only** when **all four** are absent: markdown pages, assets, valid `calendar.json`, valid `relations.json`. Empty `pages/` alone is not a failure (assets-only or calendar-only packs are valid).

### `relations.json`

> **Most packs should not need `relations.json`.** Wikilinks cover the vast majority of relationships.

### `pack.json`

Omit in authored packs. Manifest `contentPacks[]` is authoritative.

## Campaign origin

When created from a pack, core stores `appearanceProfile.contentPackOrigin` with `pluginId`, `pluginVersion`, `packId`, display name snapshot, optional author fields, and `importedAt`. This is a diagnostics snapshot — not a runtime plugin dependency.

Future UI example: *Created from: Tomb of Horrors (Demo) · Esiana Team · Imported June 2026*.

## Demo content packs

`community-plugins/demo-content-packs` ships:

| Pack | Purpose |
|------|---------|
| `girl-by-moonlight-one-shot` | Flagship — full pre-1.0 narrative system validation |
| `daggerheart-demo` | Character, org, quest genre slice |
| `starfinder-demo` | Maps, locations, map pins |
| `tomb-of-horrors-demo` | Import fidelity regression (frozen) |
| `player-experience-demo` | Visibility / knowledge boundaries (frozen) |

Manual UI verification: [gbm-ui-walkthrough.md](./gbm-ui-walkthrough.md). **West Marches** remains core Sample Data only.

Legacy wizard `generator` payloads (`campaign-seeder` presets) map to content packs or sample data for one release via `legacyGeneratorToBootstrap`.

## Admin developer tools

`/admin/config/sample-data` — generate sample campaigns when `ENABLE_SAMPLE_DATA=true`.

Content Packs are managed under Admin → Plugins like any other plugin.

## CLI

From repo root:

```bash
ENABLE_SAMPLE_DATA=true npm run seed-campaign -- --plan-only --profile benchmark-medium
ENABLE_SAMPLE_DATA=true npm run profile-capacity -- --slug my-campaign --token "$TOKEN" --output reports/bench.json
```

Requires bearer token with `campaign:seed` scope for HTTP execution.

## Legacy campaign-seeder plugin

The community `campaign-seeder` plugin engine is superseded by core Sample Data. Scenario JSON presets are converted to markdown in `demo-content-packs` — scenario JSON is frozen, not an author format. The `campaignGenerator` capability is retired; use Content Packs or Sample Data in the wizard.
