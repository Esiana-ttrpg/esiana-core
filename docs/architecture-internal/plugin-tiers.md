# Plugin tiers

Esiana plugins are classified by **scope** and optional **capabilities** declared in `manifest.json`. There is no separate database type per tier — the host reads manifest metadata only.

## Global vs campaign scope

Plugins declare `"scope": "global"` or `"scope": "campaign"` in `manifest.json`. Installation and activation are separate layers:

| Layer | Server admin | Campaign admin |
|-------|--------------|----------------|
| **Install / upgrade / remove** | All plugins (global + campaign) via Admin → Plugins & Integrations | Never |
| **Enable / disable** | Global-scope plugins only | Campaign-scope plugins only |
| **Configure** | Instance-wide config | Per-campaign config + secrets |
| **Remove from campaign** | N/A (global uninstall removes all campaigns) | Deletes campaign PluginData, config, secrets, assets |

| Scope | Admin surface | Campaign surface | Examples |
|-------|---------------|------------------|----------|
| `global` | Install, enable, configure | N/A | Content packs, themes, SSO, storage drivers |
| `campaign` | Install only (available to all campaigns) | Enable, configure, disable, remove | Player Journal, moon tracker, reputation |

**Lifecycle:** Install on server → available globally → campaign admin enables → configure → use → disable (data retained) or remove from campaign (data deleted).

## Capabilities (manifest-only)

```json
{
  "capabilities": ["campaignGenerator"],
  "generatorPresets": [
    {
      "id": "west-marches",
      "label": "Simulated West Marches",
      "description": "High-activity sandbox with many sessions and players.",
      "defaultSeed": "west-marches-v1",
      "seedFakeParty": true
    }
  ]
}
```

| Capability | Meaning |
|------------|---------|
| `campaignGenerator` | **Retired** — legacy shim maps old `presetId` values to Content Packs or Sample Data for one release |
| `contentPack` | Data-only plugin declaring `contentPacks[]` for Create Campaign import (markdown, assets, `calendar.json`, optional `relations.json`) |

Generators may declare `generatorPresets[]` for Create Campaign wizard cards. Preset fields:

| Field | Meaning |
|-------|---------|
| `defaultSeed` | Deterministic RNG seed when the wizard does not supply one |
| `attachCampaignPlugins` | Campaign-scoped plugin ids to enable after seeding completes |
| `seedFakeParty` | Seed wiki PC pages under `World/Party`; with demo users enabled, also create fake `User` + `CampaignMember` rows |
| `joinAsPlayer` | Creator becomes `PLAYER` with a linked PC page; a fake DM user owns the campaign (requires demo users) |

## Campaign generator presets (`campaign-seeder`)

| Preset | Summary |
|--------|---------|
| **west-marches** | High-activity sandbox: locations, factions, NPCs, sessions, quests, and full skeleton wiki coverage. Creator stays **DM**; fake party appears when demo users are enabled. |
| **tomb-of-horrors-demo** | Thin original dungeon demo (not copyrighted module text): maps, rooms, NPCs, quests, events, journals, plus skeleton coverage. Attaches **player-journal**. Creator stays **DM**. |
| **player-experience-demo** | Lighter scenario focused on player visibility (party quest, DM-only journal). Creator joins as **PLAYER**; fake DM + party when demo users are enabled. Attaches **player-journal**. |

All three presets populate skeleton sidebar categories (Bestiary, Ancestries, Objects, Families, Party, Rules, Tags, etc.). System views (`Recent Changes`, `Relations`, `Dashboard` index, `Quick Access` — planned DM tool) remain computed — they are not seeded with fake pages except an optional **Demo Login Credentials** note on the Dashboard when demo users are enabled.

## Demo users (`ENABLE_DEMO_USERS`)

Fake login accounts are **opt-in** via environment variable — not gated on `NODE_ENV`, so staging and preview servers can enable them explicitly.

```env
ENABLE_DEMO_USERS=true
```

When `ENABLE_DEMO_USERS` is **false** (default):

- Presets still seed **wiki PC pages** under `World/Party` (safe for any environment).
- No seeded `User` or extra `CampaignMember` rows are created.
- `joinAsPlayer` / fake DM flows are skipped; the creator remains **DM**.
- No demo credentials page is written to the wiki.

When `ENABLE_DEMO_USERS` is **true**:

- Seeded accounts use email `{campaignSlug}-dm@seed.esiana.local` and `{campaignSlug}-player-{n}@seed.esiana.local`.
- Password (dev/demo only): `esiana-demo-seed` — surfaced on a seeded Dashboard page for the **player-experience-demo** preset.
- Users are tagged in `User.appearanceProfile.seedProvenance` (`isSeededDemoAccount`, `source`, `campaignId`, `presetId`) and via the `@seed.esiana.local` email domain.
- Helpers: `isSeededDemoEmail()`, `isSeededDemoUser()` in `backend/src/lib/seedDemoCampaignMembers.ts`.

**Future (out of v1):** optional `User.isSeededDemoAccount` column or cleanup job keyed on `appearanceProfile.seedProvenance` if query volume warrants it.

## Sample Data (core dev fixtures)

**Sample Data** is not a plugin capability. Core ships benchmark campaign profiles (`benchmark-small` through `benchmark-extreme`) gated by `ENABLE_SAMPLE_DATA=true`. The Create Campaign wizard shows a separate **Sample Data** section (developer badge) only when enabled. See [sample-data-generator.md](./sample-data-generator.md).

## Content Packs

A **Content Pack** is plugin-authored lore — markdown under `packs/{id}/pages/**/*.md`, optional `assets/`, optional `calendar.json` (Fantasy Calendar export schema), optional `relations.json`. Manifest `contentPacks[]` is the single source of picker metadata. Content Packs are **never** env-gated; only plugin install/enable matters.

> Folders belong to authors. Frontmatter belongs to Esiana.  
> **Markdown = content. JSON = structure. Assets = media.**

Import is orchestrated by core `importContentPack()` over existing importers. Campaigns store `appearanceProfile.contentPackOrigin` (including `pluginVersion`) after import — import-time dependency only.

`demo-content-packs` ships tomb and player-experience markdown conversions. **West Marches** remains core Sample Data.

## Where things live

- **Content Packs** — Admin → Plugins + Create Campaign wizard (when packs are installed)
- **Sample Data** — `ENABLE_SAMPLE_DATA` + Admin → Sample Data + wizard dev section
- **Campaign plugin** — Campaign Settings → Plugins (enable/configure server-installed campaign capabilities)
- **Import (Markdown ZIP)** — Wizard import path; separate from packs/sample data

New authored content should use `contentPack`. Legacy wizard `generator` payloads shim via `legacyGeneratorToBootstrap`.

## Acceptance checks

- **West Marches / ToH:** every listed sidebar category has ≥1 child page; Tags hub shows tagged pages.
- **`ENABLE_DEMO_USERS=true`:** ensemble shows fake players with linked identity pages; West Marches / ToH keep the creator as DM.
- **`ENABLE_DEMO_USERS=false`:** wiki Party folder still has PC pages; no fake `User` rows.
- **Player Experience Demo + `ENABLE_DEMO_USERS=true`:** creator opens the campaign as **PLAYER**; fake DM exists; player-journal is enabled.
