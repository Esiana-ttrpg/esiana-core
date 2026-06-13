# Demo Content Packs

Markdown content packs for the Esiana Create Campaign wizard. Phase 2B adds flagship validation packs alongside legacy scenario conversions.

## Packs

| Pack ID | Purpose |
|---------|---------|
| `girl-by-moonlight-one-shot` | Full pre-1.0 narrative system validation (flagship) |
| `daggerheart-demo` | Character, org, quest genre slice |
| `starfinder-demo` | Maps, locations, map pins |
| `tomb-of-horrors-demo` | Import fidelity regression (frozen) |
| `player-experience-demo` | Visibility / knowledge boundaries (frozen) |

**West Marches** remains a core **Sample Data** profile — not a content pack.

## Pack layout (Format v1)

```
packs/<pack-id>/
├── pages/          # recursive *.md (YAML frontmatter)
├── assets/         # optional maps and images
├── calendar.json   # optional — Fantasy Calendar export schema
├── relations.json  # optional — map pins, explicit links, tags
├── campaign.json   # optional — recruitment tagline, description
└── knowledge.json  # optional — lore claims, historical aliases
```

**Markdown = content. JSON = structure. Assets = media.**

See [sample-data-generator.md](https://github.com/Esiana-ttrpg/esiana-core/blob/main/docs/architecture-internal/sample-data-generator.md) and [content-pack-audits.md](https://github.com/Esiana-ttrpg/esiana-core/blob/main/docs/audits/content-pack-audits.md) in esiana-core.

## Generating packs

```bash
# From this directory (community-plugins/demo-content-packs)
node scripts/generate-gbm-pack.mjs
node scripts/generate-genre-packs.mjs
node scripts/convert-from-seeder.mjs   # tomb + player-experience only
```

**Important:** Esiana does not read `community-plugins/` at runtime. After generating or editing packs, sync into core:

```bash
# From esiana-core repo root
npm run plugins:link
```

Then **restart the backend** (or `POST /api/plugins/sync` as an admin). The wizard loads pack metadata from the installed copy under `esiana-core/plugins/`, not from this folder directly. If the plugin was installed before a manifest update, re-linking fixes stale `contentPacks[]` entries (e.g. Girl by Moonlight missing while only Tomb/Player Experience show).

## Install

Enable globally via Admin → Plugins, then choose a pack in the Create Campaign wizard **Content Packs** section.

Manual UI walkthrough for GbM: [gbm-ui-walkthrough.md](https://github.com/Esiana-ttrpg/esiana-core/blob/main/docs/architecture-internal/gbm-ui-walkthrough.md).
