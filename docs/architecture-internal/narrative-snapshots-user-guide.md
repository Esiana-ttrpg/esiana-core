# Narrative snapshots — user guide

Operational guidance for DMs using **Campaign History** and snapshot comparison in Esiana.

For technical architecture (payload tiers, compression, API), see [temporal-snapshots.md](./temporal-snapshots.md).

## What snapshots are

Snapshots are **historical captures of projected campaign state**—what the narrative engine believed about factions, NPC presence, rumors, danger, and location context at a specific moment in chronology.

They are derived from your wiki and chronology. They are **not**:

- Save files or checkpoints you can “load” to rewind the campaign
- Alternate timelines or player-facing fiction on their own

Think of them as photographs of the world’s operational state at a point in time.

## Kinds of snapshots

| Kind | Badge | How it is created |
|------|-------|-------------------|
| **Visit** | Visit | Automatic when you mark a location as visited by the party |
| **Milestone** | Milestone | Manual checkpoint you capture from Campaign History or the narrative-snapshots API |
| **Manual** | Manual | Labeled capture (same family as milestones; reserved for explicit manual labeling) |

**Archived / cold** snapshots are retained for history but may not be available for comparison. Only **hot** snapshots with full payload data can be compared.

## When to capture a milestone

Capture a milestone when the campaign crosses a boundary you may want to reference later:

- End of a story arc
- Before or after a time skip
- Start or end of a war or major conflict
- After a major discovery or revelation
- When faction power shifts significantly

Visit snapshots happen automatically when you mark locations visited—you do not need to duplicate those unless you also want a named milestone.

## What comparison shows

Comparing an **earlier moment** to a **later moment** summarizes what changed in the scoped region:

- Faction and organization stance shifts
- NPC presence and movement
- Rumors and party knowledge deltas
- Danger level changes
- Location-related evolution visible in the projection

Comparison always runs from **older → newer**. If you pick moments in reverse order, the UI will swap them to preserve that direction.

**DM vs party view:** DMs see the full operational diff (`perspective=dm`). Player-facing surfaces use party projection only and may hide unrevealed information.

## Limits (v1)

- **Two saved moments required.** Comparing a past moment to “today’s live world state” is planned but not available in v1.
- **Region anchor required.** Compare works when snapshots are tied to a location/region anchor. Campaign-wide milestones without a location anchor cannot be compared region-to-region yet—you will see an error explaining this limitation.
- **Archived snapshots** cannot be compared; only hot payloads with full facet data are supported.
- **Version warnings** may appear when snapshot capture used older projection semantics. See [temporal-snapshots.md](./temporal-snapshots.md) for how versioning and immutability work.

## Where to find it

Open **Chronology → Feed** (DM or co-DM). Scroll to **Campaign History** at the bottom of the feed view.

Use **What are snapshots?** for a quick in-app summary, or return to this guide for fuller operational detail.
