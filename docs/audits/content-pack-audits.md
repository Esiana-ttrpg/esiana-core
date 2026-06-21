# Content Pack Audits (Phase 2B)

Pre-1.0 validation audits for import/export fidelity and showcase pack authoring. Complements [sample-data-generator.md](./sample-data-generator.md) (Format v1) and [gbm-ui-walkthrough.md](./gbm-ui-walkthrough.md) (manual verification). Pre-1.0 entity matrix: [pre-1.0-export-audit.md](./pre-1.0-export-audit.md).

## Template definition source-of-truth

**Risk:** A manually maintained export key union drifts when parsers gain fields — UI works, export drops data.

**Current state (Phase 2B):**

| Layer | Source |
|-------|--------|
| Parsers | Each `*Metadata.ts` module has internal `*_METADATA_KEYS` — not exported individually |
| Round-trip | [`pageMetadataRoundTrip.ts`](../../backend/src/lib/pageMetadataRoundTrip.ts) collects `PAGE_METADATA_ROUND_TRIP_KEYS` from parser modules via a single import graph |
| Export | [`wikiPageToMarkdown.ts`](../../backend/src/lib/campaignExport/wikiPageToMarkdown.ts) delegates to `metadataToFrontMatterFields` |
| Pack import | [`markdownPackImporter.ts`](../../backend/src/lib/markdownPackImporter.ts) uses `frontMatterFieldsToMetadata` — no per-template burying |
| Backup restore | [`campaignBackupRestore.ts`](../../backend/src/lib/campaignBackupRestore.ts) shares the same path |

**Interim (shipped):** Programmatic key collection + parity tests. Drift is caught when tests fail, not silently at export.

**Recommendation (post-v1):** Shared template schema registry or codegen that UI, parsers, and round-trip consume — avoid two lists (parser keys vs export keys).

## Template parity checklist

Each template type should survive **UI create → export → import → metadata diff**:

| Template | Round-trip path | Notes |
|----------|-----------------|-------|
| Character | Category 1 metadata | `appearance`, `partyParticipation`, `activeArc`, slug refs |
| Location | Category 1 | `locationType`, region refs |
| Organization | Category 1 | `leaderId`, `relations[]`, `emblemAssetId` |
| Family | Category 1 | lineage fields, `headCharacterId` |
| Object | Category 1 | quest links via metadata / wikilinks |
| Bestiary | Category 1 | `relatedLocationIds` |
| Ancestry | Category 1 | region presence arrays |
| Quest | Category 1 | `questStatus`, `questGiverId`, lifecycle |
| Objective | Category 1 | parent quest slug |
| Thread | Category 1 | `relatedPageIds`, narrative status |
| Scene | Category 1 | linked quest/objective/thread arrays |
| Arc | Category 1 | `containedPageIds` |
| Journal | Category 1 | author refs |
| Session Note | Category 1 | session anchor metadata |
| Map page | Category 1 + satellite | `mapAssetPath` → `mapAssetId` bootstrap |
| Rule/Resource | Category 1 | standard codex fields |
| Downtime Haven page | Category 1 + satellite | `havenFields` → `DowntimeHaven` row |
| Downtime Project page | Category 1 + satellite | `projectFields` → `DowntimeProject` row |
| Event lore page | Category 1 | `eventConsequences` definitions |

Tests: [`pageMetadataRoundTrip.test.ts`](../../backend/src/lib/pageMetadataRoundTrip.test.ts), [`markdownPackImporter.test.ts`](../../backend/src/lib/markdownPackImporter.test.ts), [`wikiPageToMarkdown.test.ts`](../../backend/src/lib/campaignExport/wikiPageToMarkdown.test.ts).

## Custom-field round-trip

Codex **`metadata.fields[]`** (`{ key, value }`) is Category 1:

- Export: serialized as `fields` JSON in frontmatter
- Import: restored to `metadata.fields`
- Unknown flat keys on category pages: not promoted to typed parser fields unless key is in `PAGE_METADATA_ROUND_TRIP_KEYS`

**Policy:** Custom fields round-trip without the originating template plugin. Typed parser fields take precedence when keys collide.

## Relationship coverage matrix

Edges rebuild via [`rebuildEntityRelationsForCampaign`](../../backend/src/lib/entityRelationSyncService.ts) from metadata + wikilinks + map pins.

| Kind | Pack v1 source |
|------|----------------|
| `WIKI_REFERENCE` | `[[wikilink]]` in body |
| `ORG_DIPLOMATIC` | org `relations[]` metadata |
| `ORG_PARENT` | `parentOrgId` slug ref |
| `ORG_LEADER` | `leaderId` slug ref |
| `ORG_HQ` | HQ location slug ref |
| `CHARACTER_AFFILIATION` | `orgAffiliations`, `primaryAffiliationId` |
| `CHARACTER_LINEAGE` | family / parent / spouse links |
| `CHARACTER_SOCIAL` | `socialLinks`, `parentLinks`, `spouseLinks` |
| `QUEST_GIVER` | `questGiverId` |
| `QUEST_FACTION` | `factionId` |
| `THREAD_RELATED` | `relatedPageIds` |
| `THREAD_PAYOFF` | `payoffPageId` |
| `SCENE_*` | scene linked* arrays |
| `ARC_CONTAINS` | `containedPageIds` |
| `QUEST_OBJECTIVE` | objective parent quest |
| `OBJECTIVE_SCENE` | scene ↔ objective metadata |
| `LOCATION_*` | location metadata refs |
| `MAP_TARGETS` | **`relations.json` mapPins** |
| `HAVEN_*` | haven satellite bootstrap + slug refs |
| `PAGE_PARENT` | `parentKey` / folder tree |
| `CALENDAR_PREREQUISITE` | **Cannot recreate in packs v1** (CalendarEvent rows) |
| `QUESTLINE_CONTAINS` | arc/quest hierarchy metadata |

Prefer wikilinks + metadata over `relations.json`. Use `relations.json` for map pins and explicit import-time links when slug resolution order matters.

## Chronology / timeline

| Layer | Storage | Pack v1 |
|-------|---------|---------|
| Calendar definition | `FantasyCalendar` | `calendar.json` ✓ |
| Calendar events | `CalendarEvent` DB rows | **Not in v1** — use event lore pages |
| Event lore | Wiki pages + `eventConsequences` | Pages ✓ |
| Entity chronology | `birthDate`, `questDate`, etc. | Frontmatter ✓ |
| Timeline wiki pages | Under `Game/Timelines` | Pages ✓ |
| Narrative chronology pins | `timelinePin` on appearance | Metadata JSON ✓ |

**Decision (v1):** Option A — event lore **pages** with chronology frontmatter. Full `CalendarEvent` import is post-v1.

## Narrative consequence coverage

| Concern | Pack v1 |
|---------|---------|
| Author `eventConsequences` definitions on event pages | **Yes** — Category 1 metadata |
| Pre-applied consequence world state | **No** — operator applies in UI |
| `CampaignWorldEventSuggestion` rows | **Unsupported** |

## Knowledge layer (pre-1.0 decision)

**Decision: `knowledge.json` is supported in Format v1 (optional).**

| Mechanism | Pack v1 |
|-----------|---------|
| Page visibility (`Party` / `DM_Only`) | Frontmatter `visibility` ✓ |
| Thread/quest lifecycle | Metadata → `NarrativeLifecycleState` rebuild ✓ |
| Haven discovery | Haven satellite bootstrap ✓ |
| Lore claims | `knowledge.json` → `LoreClaim` ✓ |
| Historical aliases | `knowledge.json` → `EntityHistoricalAlias` ✓ |

GbM flagship ships lore claims, aliases, and conflicting sources tied to active quests.

## Asset reference validation

| Field | Convention | Resolved at import |
|-------|------------|-------------------|
| `appearance.portraitUrl` | `asset:portraits/x.webp` | `/api/assets/{id}` |
| `appearance.gallery[].imageUrl` | `asset:...` | same |
| `emblemAssetId` | `asset:` or slug | asset map |
| `mapAssetId` / `mapAssetPath` | `asset:maps/x.webp` | `WikiPage.mapAssetId` |
| Body images | `![alt](asset:path)` | existing rewrite |
| Campaign banner/cover | `campaign.json` `coverImagePath` | `importManifest.assets.coverImageAssetId` → Campaign Home hero |

Tests: `resolveAppearanceAssetRefs` in [`pageMetadataRoundTrip.test.ts`](../../backend/src/lib/pageMetadataRoundTrip.test.ts).

## Satellite bootstrap (Category 3)

| Satellite | Bootstrap |
|-----------|-----------|
| `DowntimeHaven` | Post-import from haven page + `havenFields` |
| `DowntimeProject` | Post-import from project page + `projectFields` |
| `WikiPage.mapAssetId` | `asset:` frontmatter resolution |
| `Campaign` shell | `campaign.json` (`recruitmentTagline`, `description`) |
| `LoreClaim` / aliases | `knowledge.json` |

**Unsupported v1:** `CampaignMember`, map layers/regions, `CalendarEvent` rows, applied consequence state, world event suggestions.

## Showcase packs

| Pack | Role |
|------|------|
| `girl-by-moonlight-one-shot` | Full pre-1.0 narrative system validation |
| `daggerheart-demo` | Character + org + quest genre slice |
| `starfinder-demo` | Maps + locations + map pins |
| `tomb-of-horrors-demo` | **Frozen** — import fidelity regression |
| `player-experience-demo` | **Frozen** — visibility / knowledge boundaries regression |
