# Narrative Platform roadmap restructure

**Status:** Implemented (2026-06-03)  
**Changelog:** [changelog.md](../../changelog.md) → `[Unreleased]` → **Changed**

## Rationale

The roadmap had drifted into **schema-first sequencing** (numbered phases, pre- vs post-1.0 splits on the same narrative domain) while product direction and IA treat **narrative orchestration as the platform** — not optional post-1.0 polish.

Esiana is positioned as a **narrative operating system for long-form TTRPG campaigns**, not primarily a campaign wiki with future narrative features.

## Decisions

| Topic | Choice |
|-------|--------|
| Primary organizing axis | Product domains and user workflows (Narrative Platform pillar first) |
| Release timing | Annotated as metadata (`gate:pre-1.0`, `schema-sensitive`, `ui-only`, `post-freeze-safe`) |
| Legacy phase numbers | Kept as `legacy: Phase N` on open items for searchability |
| Shipped work | Migrated from `todo.md` registry to [changelog.md](../../changelog.md), grouped by **domain** under `[Unreleased]` (not by phase number) |
| Phase 15.5 | Elevated to **Narrative Platform → Workspace** (Story Authoring, Investigation, Intelligence, Creative Workflow, Architecture) |

## Old phase → new domain mapping

| Legacy phase | New domain | Gate |
|--------------|------------|------|
| 9, 9B, 7A, 7C | Maps & spatial + Narrative Platform / Revelation & visibility | Shipped → changelog |
| 22, 23 (pre) | Foundation → Knowledge & Revelation | Shipped → changelog |
| 19 (pre) | Foundation → Temporal & Canon + Integrity | `gate:pre-1.0` |
| 20 (pre) | Foundation → Narrative State | `gate:pre-1.0` |
| 15.5 skeleton | Foundation → Narrative State | `gate:pre-1.0` |
| 15.5 (full UI) | Workspace → Story / Investigation / Intelligence / Creative / Architecture | post-1.0 |
| 19–21 (post) | Workspace + Memory & history | post-1.0 |
| 11–13 | Platform & infrastructure | v1.0 / parallel docs |
| 15–16 | Campaign & table operations | v1.1+ |
| 17 | Cross-campaign & ecosystem | post-1.0 |
| 24, 7.6 | Living world & geography | research |

## Changelog migration checklist

| Domain | Migrated to `[Unreleased]` |
|--------|----------------------------|
| Narrative Platform — Knowledge & Revelation | Yes |
| Narrative Platform — Revelation & visibility (fog, map revelation) | Yes |
| Maps & spatial (presence, temporal, atlas) | Yes (merged with existing map entries) |
| Codex, notifications, security, plugins, Campaign Home, hub, workflow | Yes (reorganized headings) |
| Data portability + plugin registry | Yes |
| v0.7.0 / v0.8.0 retrospective sections | Unchanged |

## Files touched

- [todo.md](../../todo.md) — open work only; Narrative Platform pillar; thin release gates
- [changelog.md](../../changelog.md) — domain-grouped `[Unreleased]`; restructure **Changed** entry
- [docs/deferred-backlog.md](../deferred-backlog.md) — vision table anchors
- [docs/architecture-internal/lore-knowledge-extension-points.md](../architecture-internal/lore-knowledge-extension-points.md)
- [docs/plans/knowledge-architecture.md](./knowledge-architecture.md) — roadmap domain line
- [docs/plans/phase-23-discovery-knowledge.md](./phase-23-discovery-knowledge.md) — roadmap domain line

## Out of scope

- Application code changes
- Renaming `docs/plugins/phase-10-ecosystem.md` or other historical plan filenames
- Editing the Cursor plan artifact under `.cursor/plans/`

---

## Follow-up (2026-06-03): engine dependency layers

The domain model above was refined to **six engine layers** (L1 Canon → L6 Intelligence) so the roadmap reflects dependency chains, not just feature areas.

| Prior domain | Engine layer |
|--------------|--------------|
| Foundation → Knowledge & Revelation | **Layer 1** — revelation projection (shipped) |
| Foundation → Temporal & Canon | **Layer 1** — chronology graph, temporal snapshots |
| Foundation → Narrative State | **Layer 2** — quest lifecycle, open threads |
| Living world & geography | **Layer 3** |
| Integrity + structural diagnostics | **Layer 4** |
| Workspace (story / investigation / views) | **Layer 5** |
| Intelligence + memory/history generators | **Layer 6** |

Plan: [narrative-engine-layers.md](./narrative-engine-layers.md). Changelog remains domain-grouped; [todo.md](../../todo.md) tracks open work by layer.
