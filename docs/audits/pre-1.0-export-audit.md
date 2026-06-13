# Pre-1.0 export / import audit

**Status:** Audited 2026-06-13 (automated harness: [`pre1ExportEntityMatrix.integration.test.ts`](../../backend/src/lib/pre1ExportEntityMatrix.integration.test.ts))

Complements [content-pack-audits.md](./content-pack-audits.md) and operator guide [data-backup-and-export.md](../../../docs/features/data-backup-and-export.md).

## Question per entity

> Can it leave Esiana? Can it come back?

## Pipelines

| Pipeline | Entry | Audience |
|----------|-------|----------|
| **Sovereign ZIP** | [`buildSovereignExport.ts`](../../backend/src/lib/campaignExport/buildSovereignExport.ts) | GM portable archive |
| **Content pack** | [`contentPackImporter.ts`](../../backend/src/lib/sampleData/contentPackImporter.ts) | Plugin / sample seed |
| **Obsidian ZIP** | [`campaignImportProcessor.ts`](../../backend/src/lib/campaignImportProcessor.ts) | External vault import |

## Remediation tiers

| Tier | Meaning |
|------|---------|
| **A** | GM sovereign path must round-trip, or product copy must change |
| **B** | Document + rebuild acceptable when metadata is sufficient |
| **C** | Full-clone / post-1.0 tier |

---

## Entity matrix

| Entity | Representation | Sovereign export | Sovereign restore | Pack | Obsidian | Tier | Notes |
|--------|----------------|------------------|-------------------|------|----------|------|-------|
| **Character** | `CHARACTER` wiki + metadata | Pass | Pass | Pass | Pass (module map) | A | Verified in matrix test |
| **Location** | `LOCATION` wiki + metadata | Pass | Pass | Pass | Pass | A | |
| **Organization** | `ORGANIZATION` wiki + metadata | Pass | Pass | Pass | Pass | A | Org relations rebuild from metadata |
| **Family** | `FAMILY` wiki + metadata | Pass | Pass | Pass | Pass | A | |
| **Object** | `DEFAULT` + object metadata | Pass | Pass | Pass | Partial | A | No dedicated `OBJECT` template |
| **Species / Ancestry** | `DEFAULT` + `entityCategory: ancestries` | Pass | Pass | Pass | Pass | A | UI label "Ancestries" |
| **Map** | wiki + `mapAsset` + pins | Partial | Partial | Partial | Images only | **B** | Pins + assets yes; map layers not serialized |
| **Adventure** | quest/arc/scene/objective pages | Pass | Pass | Pass | Partial | A | Lifecycle table rebuilt post-restore |
| **Session** | `SESSION_NOTE` | Pass | Pass | Pass | Pass | A | Session timeline ops separate (C) |
| **Journal** | `JOURNAL` | Pass | Pass | Pass | Pass | A | |
| **Timeline** | page metadata + calendars | Partial | Partial | `calendar.json` | Folder map | **B** | Calendar JSON is separate export |
| **Standing / Reputation** | `CampaignReputation*` tables | Fail | Fail | Fail | Fail | **C** | Not lore-sovereign |
| **Narrative threads** | wiki + lifecycle | Pass (pages) | Pass (rebuild) | Pass | Partial | **B** | Lifecycle rebuilt, not serialized |
| **Knowledge / Fog** | claims, aliases, presence | Pass (claims/aliases) | Pass | Pass | Fail | **A** | `sovereign/knowledge.json`; presence rows B |
| **Fog presence rows** | `ContentPresenceState` | Fail | Fail | Fail | Fail | **B** | Visibility metadata round-trips |
| **Downtime** | haven/project satellites | Pass | Pass | Pass | Fail | A | `sovereign/operational.json` |
| **Plugin KV** | `PluginData` | Pass | Pass | N/A | Fail | A | |
| **Members / ledger** | operational DB | Fail | Fail | Fail | Fail | **C** | Admin full bundle partial |

---

## A-tier remediation (shipped)

1. **`sovereign/knowledge.json`** — [`sovereignKnowledge.ts`](../../backend/src/lib/campaignExport/sovereignKnowledge.ts)
2. **Obsidian template typing** — [`importModuleTemplateType.ts`](../../backend/src/lib/importModuleTemplateType.ts)

## B-tier (acceptable for 1.0)

Map layers, narrative lifecycle DB rows, content presence projection, calendar event rows.

## C-tier (post-1.0)

Members, reputation, ledger, session timeline ops, webhooks.

---

Reader-facing summary: [docs/architecture/sovereignty.md](../../../docs/architecture/sovereignty.md)

## Falsification

Runs in both CI jobs (`test-sqlite`, `test-postgres`):

```bash
cd esiana-core/backend
npm test -- --test-name-pattern="pre-1.0 export matrix"
```
